import { execCommand } from "@getpaseo/plugin/server";

interface SignalOptions {
  platform: NodeJS.Platform;
  pid: number;
  signal: NodeJS.Signals;
}

type SignalPlan =
  | { type: "group"; pid: number; signal: NodeJS.Signals }
  | { type: "tree"; command: "taskkill"; args: string[] };

export function signalPlan(options: SignalOptions): SignalPlan {
  if (options.platform === "win32") {
    return { type: "tree", command: "taskkill", args: ["/PID", String(options.pid), "/T", "/F"] };
  }
  return { type: "group", pid: -options.pid, signal: options.signal };
}

export function signalProcess(options: SignalOptions): void | Promise<void> {
  const plan = signalPlan(options);
  if (plan.type === "tree") return killTree(plan);
  try {
    process.kill(plan.pid, plan.signal);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ESRCH")) throw error;
  }
}

/**
 * Reaping is best effort. taskkill reports an already-exited PID, a child that died between the
 * walk and the kill, and a protected process the same way it reports real failures, and none of
 * them may turn a stop or a close into a failed request.
 */
async function killTree(plan: Extract<SignalPlan, { type: "tree" }>): Promise<void> {
  try {
    await execCommand(plan.command, plan.args, { shell: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[antigravity] ${plan.command} ${plan.args.join(" ")} failed: ${message}`);
  }
}
