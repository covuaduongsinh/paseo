import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { spawnProcess } from "@getpaseo/plugin/server";
import { signalProcess } from "./signals.js";
import { createInterface } from "node:readline";
import type { ProviderLaunch, ProviderSessionConfig } from "@getpaseo/plugin/server/provider";
import {
  AntigravityError,
  decodeFrame,
  diagnostic,
  encodePrompt,
  type Frame,
  type Init,
} from "./wire.js";

const PROBE_RETRY_DELAY_MS = 250;
// Antigravity never emits frames this large; a longer line means the stream is corrupt.
const MAX_LINE_LENGTH = 8 * 1024 * 1024;

// A 190 MB PyInstaller bundle unpacks itself on every launch, so these deadlines are generous.
// They are read per use so a host can tune them without restarting the plugin.
function probeTimeout(): number {
  return readTimeout("PASEO_ANTIGRAVITY_PROBE_TIMEOUT_MS", 30_000);
}

function startupTimeout(): number {
  return readTimeout(
    "PASEO_ANTIGRAVITY_STARTUP_TIMEOUT_MS",
    process.platform === "win32" ? 60_000 : 30_000,
  );
}

function readTimeout(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function report(message: string): void {
  console.error(`[antigravity] ${message}`);
}

interface DriverOptions {
  launch: ProviderLaunch;
  config: ProviderSessionConfig;
  conversationId: string | null;
  onFrame(frame: Frame): void;
  onExit(error: AntigravityError): void;
}

export interface Driver {
  ready: Promise<Init>;
  selection: string;
  prompt(text: string): Promise<void>;
  stop(reason: "interrupt" | "close"): Promise<void>;
}

export function selection(config: ProviderSessionConfig): string {
  return JSON.stringify([config.model, config.mode]);
}

function driverArgs(options: DriverOptions): string[] {
  const { config, conversationId } = options;
  const args = [
    ...options.launch.args,
    "--input-format",
    "stream-json",
    "--output-format",
    "stream-json",
    "--add-dir",
    config.cwd,
    "--disable-slash-commands",
    "--dangerously-skip-permissions",
  ];
  if (config.model) args.push("--model", config.model);
  if (conversationId) args.push("--conversation", conversationId);
  return args;
}

export function startDriver(options: DriverOptions): Driver {
  const child = spawnProcess(options.launch.command, driverArgs(options), {
    cwd: options.config.cwd,
    env: { ...options.launch.env, ...options.config.env },
    detached: process.platform !== "win32",
    stdio: "pipe",
  });
  const lines = createInterface({ input: child.stdout });
  let cleanup = Promise.resolve();
  let stderr = "";
  let ignored = 0;
  let state: "starting" | "ready" | "stopping" | "exited" = "starting";
  let resolveReady: (init: Init) => void;
  let rejectReady: (error: Error) => void;
  const ready = new Promise<Init>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  let resolveExit: () => void;
  const exited = new Promise<void>((resolve) => {
    resolveExit = resolve;
  });
  const startupDeadlineMs = startupTimeout();
  const startupDeadline = setTimeout(
    () =>
      fail(
        new AntigravityError(
          `Antigravity did not initialize within ${Math.round(startupDeadlineMs / 1000)} seconds`,
          "STARTUP_TIMEOUT",
        ),
      ),
    startupDeadlineMs,
  );
  child.stderr.on("data", (chunk: Buffer) => {
    stderr = (stderr + chunk.toString()).slice(-8192);
  });
  child.stdin.on("error", (error: Error) =>
    fail(new AntigravityError(error.message, "STDIN_ERROR")),
  );
  child.on("error", (error: Error) => fail(new AntigravityError(error.message, "SPAWN_ERROR")));
  child.on("close", (code, signal) => {
    clearTimeout(startupDeadline);
    lines.close();
    const error = new AntigravityError(
      diagnostic(stderr.trim() || `Antigravity exited (${signal || code})`),
      "PROCESS_EXIT",
    );
    if (state === "starting") rejectReady(error);
    if (state === "ready") options.onExit(error);
    state = "exited";
    resolveExit();
  });
  lines.on("line", (line) => {
    if (!line.trim() || state === "exited" || state === "stopping") return;
    if (line.length > MAX_LINE_LENGTH) {
      skip(`dropped a ${line.length} byte line`);
      return;
    }
    const decoded = decodeFrame(line);
    if (decoded.type === "ignored") {
      skip(`${decoded.reason}: ${decoded.detail}`);
      return;
    }
    if (decoded.type === "invalid") {
      fail(new AntigravityError(`Invalid Antigravity output: ${decoded.detail}`, "INVALID_FRAME"));
      return;
    }
    if (state === "starting") {
      if (decoded.frame.event === "init") {
        clearTimeout(startupDeadline);
        state = "ready";
        resolveReady(decoded.frame);
      } else if (decoded.frame.event === "result") {
        fail(new AntigravityError(diagnostic(decoded.frame.result.error), "STARTUP_ERROR"));
      }
      return;
    }
    options.onFrame(decoded.frame);
  });

  // A banner, an update notice or a newer event type must never end the session.
  function skip(detail: string): void {
    ignored += 1;
    if (ignored <= 10) report(`skipped stdout line (${detail})`);
    else if (ignored % 100 === 0) report(`skipped ${ignored} stdout lines`);
  }

  function fail(failure: AntigravityError): void {
    clearTimeout(startupDeadline);
    if (state === "starting") rejectReady(failure);
    if (state === "ready") options.onExit(failure);
    if (state === "exited" || state === "stopping") return;
    state = "stopping";
    cleanup = Promise.resolve(signalGroup(child, "SIGKILL"));
    // The stop operation awaits cleanup and owns reporting its failure.
    void cleanup.catch(() => undefined);
  }

  return {
    ready,
    selection: selection(options.config),
    prompt(text) {
      if (state !== "ready")
        return Promise.reject(new AntigravityError("Antigravity is not ready"));
      return new Promise<void>((resolve, reject) => {
        child.stdin.write(encodePrompt(text), (error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    },
    async stop(reason) {
      // A cleanup failure is a diagnostic, never a reason to refuse a stop or a close.
      if (process.platform === "win32") await cleanup.catch(() => undefined);
      if (state === "exited") return;
      if (state === "starting") rejectReady(new AntigravityError("Antigravity startup canceled"));
      clearTimeout(startupDeadline);
      state = "stopping";
      if (process.platform === "win32") {
        // Node signal emulation kills only the leader; taskkill must see the live tree.
        cleanup = Promise.resolve(signalGroup(child, "SIGKILL"));
        await cleanup.catch(() => undefined);
        await exited;
        return;
      }
      if (reason === "close") child.stdin.end();
      else signalGroup(child, "SIGINT");
      const terminate = setTimeout(() => signalGroup(child, "SIGTERM"), 1000);
      const kill = setTimeout(() => signalGroup(child, "SIGKILL"), 2000);
      await exited;
      clearTimeout(terminate);
      clearTimeout(kill);
      // A tool can keep running after its CLI leader exits.
      signalGroup(child, "SIGKILL");
    },
  };
}

function signalGroup(
  child: ChildProcessWithoutNullStreams,
  signal: NodeJS.Signals,
): void | Promise<void> {
  if (!child.pid) return;
  return signalProcess({ platform: process.platform, pid: child.pid, signal });
}

interface ProbeOptions {
  launch: ProviderLaunch;
  args: string[];
  cwd?: string;
}

// Discovery runs while the user waits, and one slow start must not read as a failure.
export async function probe(options: ProbeOptions): Promise<string> {
  try {
    return await runProbe(options);
  } catch (error) {
    if (!isRetryable(error)) throw error;
    report(`retrying discovery after ${describeError(error)}`);
    await delay(PROBE_RETRY_DELAY_MS);
    return runProbe(options);
  }
}

function isRetryable(error: unknown): boolean {
  if (!(error instanceof AntigravityError)) return false;
  // A timeout means the bundle was still unpacking; a spawn error means it was being replaced.
  return error.code === "PROBE_TIMEOUT" || error.code === "SPAWN_ERROR";
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runProbe(options: ProbeOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawnProcess(options.launch.command, [...options.launch.args, ...options.args], {
      env: options.launch.env,
      cwd: options.cwd,
      stdio: "pipe",
      detached: process.platform !== "win32",
    });
    let stdout = "";
    let stderr = "";
    // Killing the probe makes it exit non-zero, and that exit can land before the timeout
    // rejection does. Without this flag a deadline reads as a CLI failure and is never retried.
    let timedOut = false;
    const expired = () =>
      new AntigravityError("Antigravity discovery timed out", "PROBE_TIMEOUT");
    const deadline = setTimeout(() => {
      timedOut = true;
      const termination = Promise.resolve(signalGroup(child, "SIGKILL"));
      void termination.then(() => {
        reject(expired());
        return undefined;
      }, reject);
    }, probeTimeout());
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-8192);
    });
    child.on("error", (error: Error) => {
      clearTimeout(deadline);
      reject(new AntigravityError(error.message, "SPAWN_ERROR"));
    });
    child.on("close", (code) => {
      clearTimeout(deadline);
      if (timedOut) reject(expired());
      else if (code === 0) resolve(stdout);
      else
        reject(
          new AntigravityError(
            diagnostic(stderr.trim() || `agy exited with code ${code}`),
            "PROBE_ERROR",
          ),
        );
    });
  });
}
