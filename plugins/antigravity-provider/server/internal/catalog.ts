import { createHash } from "node:crypto";
import type {
  ProviderCatalog,
  ProviderLaunch,
  ProviderModel,
  ProviderMode,
  ProviderStatus,
} from "@getpaseo/plugin/server/provider";
import { probe } from "./process.js";
import { AntigravityError } from "./wire.js";

const modes: readonly ProviderMode[] = [
  {
    id: "full-access",
    icon: "ShieldOff",
    colorTier: "dangerous",
    label: "Full access",
    description:
      "Antigravity cannot ask for permission when another app drives it. Paseo starts it with --dangerously-skip-permissions.",
    isUnattended: true,
  },
];

// `status()` and the first `session.open` ask for the same list seconds apart. Discovery costs a
// full CLI start each time, so they share one result; an explicit catalog request still refreshes.
const CATALOG_TTL_MS = 60_000;
const cached = new Map<string, { at: number; catalog: ProviderCatalog }>();
const inFlight = new Map<string, Promise<ProviderCatalog>>();

export function launchKey(launch: ProviderLaunch): string {
  const env = Object.entries(launch.env).sort(([left], [right]) => left.localeCompare(right));
  return createHash("sha256")
    .update(JSON.stringify([launch.command, launch.args, env]))
    .digest("hex");
}

interface CatalogOptions {
  cwd?: string;
  force?: boolean;
}

export async function getCatalog(
  launch: ProviderLaunch,
  options: CatalogOptions = {},
): Promise<ProviderCatalog> {
  const key = launchKey(launch);
  if (options.force) {
    cached.delete(key);
    inFlight.delete(key);
  } else {
    const entry = cached.get(key);
    if (entry && Date.now() - entry.at < CATALOG_TTL_MS) return entry.catalog;
    const pending = inFlight.get(key);
    if (pending) return pending;
  }
  const discovery = discover(launch, options.cwd)
    .then((catalog) => {
      cached.set(key, { at: Date.now(), catalog });
      return catalog;
    })
    .finally(() => {
      if (inFlight.get(key) === discovery) inFlight.delete(key);
    });
  inFlight.set(key, discovery);
  return discovery;
}

async function discover(launch: ProviderLaunch, cwd?: string): Promise<ProviderCatalog> {
  const output = await probe({ launch, args: ["models"], cwd });
  const models = parseModels(output);
  if (models.length === 0)
    throw new AntigravityError(
      `Antigravity listed no models. \`agy models\` printed: ${excerpt(output)}`,
      "EMPTY_CATALOG",
    );
  return { models, modes, thinkingOptions: [], defaultMode: "full-access" };
}

const IDENTIFIER = /^[\w./:+-]+$/;
const HEADER = /^(id|model|models|name)$/i;

/**
 * `agy models` prints `id<TAB>label`. Accept wider rows and space-aligned columns too: an output
 * tweak must not empty the model picker.
 */
export function parseModels(output: string): ProviderModel[] {
  const models: ProviderModel[] = [];
  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || /^[-=|+_\s]+$/.test(trimmed)) continue;
    const columns = (trimmed.includes("\t") ? trimmed.split("\t") : trimmed.split(/\s{2,}/))
      .map((column) => column.trim())
      .filter(Boolean);
    const [id, label] = columns;
    if (!id || !label || !IDENTIFIER.test(id) || HEADER.test(id)) continue;
    if (models.some((model) => model.id === id)) continue;
    models.push({ id, label });
  }
  return models;
}

function excerpt(output: string): string {
  const trimmed = output.trim();
  if (!trimmed) return "nothing";
  return trimmed.length > 200 ? `${trimmed.slice(0, 200)}…` : trimmed;
}

export async function getStatus(launch: ProviderLaunch): Promise<ProviderStatus> {
  try {
    const version = (await probe({ launch, args: ["--version"] })).trim();
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
    if (!match)
      return {
        available: false,
        diagnostic: "Could not read the Antigravity version. Update `agy` to 1.1.15 or later.",
      };
    const [, major, minor, patch] = match.map(Number);
    const supported = major > 1 || (major === 1 && (minor > 1 || (minor === 1 && patch >= 15)));
    if (!supported)
      return {
        available: false,
        diagnostic: `Antigravity ${version} is unsupported. Update \`agy\` to 1.1.15 or later.`,
      };
    await getCatalog(launch);
    return { available: true };
  } catch (error) {
    if (!(error instanceof AntigravityError)) throw error;
    return { available: false, diagnostic: error.message };
  }
}

export function validateSelection(
  config: { model?: string; mode?: string; thinkingOption?: string },
  catalog: ProviderCatalog,
): void {
  if (config.model && !catalog.models.some((model) => model.id === config.model))
    throw new AntigravityError(`Unknown Antigravity model: ${config.model}`, "INVALID_MODEL");
  if (config.mode && !catalog.modes.some((mode) => mode.id === config.mode))
    throw new AntigravityError(`Unknown Antigravity mode: ${config.mode}`, "INVALID_MODE");
  if (config.thinkingOption)
    throw new AntigravityError(
      "Antigravity effort is selected through the model ID",
      "UNSUPPORTED_THINKING",
    );
}
