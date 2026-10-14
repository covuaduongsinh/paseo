import type { PluginHandlerContext, PluginServerContext } from "@getpaseo/plugin/server";
import { TeamStore } from "./team-store.js";
import {
  type ProviderOption,
  listTeamsRpc,
  getTeamRpc,
  createTeamRpc,
  deleteTeamRpc,
  listTasksRpc,
  createTaskRpc,
  updateTaskStatusRpc,
  listMailboxRpc,
  sendMailboxRpc,
  listProvidersRpc,
  sendTeamPromptRpc,
  listTeamMessagesRpc,
  updateSlotProviderRpc,
} from "../shared/contracts.js";

const DEFAULT_PROVIDER_MODELS: Record<
  string,
  Array<{ id: string; label: string; description?: string; isDefault?: boolean }>
> = {
  gemini: [
    {
      id: "gemini-2.5-pro",
      label: "Gemini 2.5 Pro (1M Context)",
      description: "Google flagship reasoning & large codebase analysis",
      isDefault: true,
    },
    {
      id: "gemini-2.5-flash",
      label: "Gemini 2.5 Flash",
      description: "Fast, low-latency reasoning & high throughput",
    },
    {
      id: "gemini-2.0-flash",
      label: "Gemini 2.0 Flash",
      description: "Next-gen multimodal speed & live tools",
    },
    {
      id: "gemini-2.0-flash-thinking",
      label: "Gemini 2.0 Flash Thinking",
      description: "Experimental reasoning trace engine",
    },
    {
      id: "gemini-1.5-pro",
      label: "Gemini 1.5 Pro",
      description: "Long-horizon document & video context",
    },
    {
      id: "gemini-1.5-flash",
      label: "Gemini 1.5 Flash",
      description: "Ultra-fast lightweight model",
    },
  ],
  claude: [
    {
      id: "claude-3-7-sonnet",
      label: "Claude 3.7 Sonnet (Hybrid Reasoning)",
      description: "Anthropic flagship model for architecture & coding",
      isDefault: true,
    },
    {
      id: "claude-3-5-sonnet",
      label: "Claude 3.5 Sonnet",
      description: "Fast & intelligent coding model",
    },
    {
      id: "claude-3-5-haiku",
      label: "Claude 3.5 Haiku",
      description: "Ultra-fast response for lightweight subtasks",
    },
    { id: "claude-3-opus", label: "Claude 3 Opus", description: "Deep comprehension & writing" },
  ],
  codex: [
    {
      id: "gpt-4o",
      label: "GPT-4o (Omni)",
      description: "Flagship OpenAI model for code generation",
      isDefault: true,
    },
    {
      id: "gpt-4.5-preview",
      label: "GPT-4.5 Preview",
      description: "Advanced reasoning & synthesis",
    },
    {
      id: "o3-mini",
      label: "o3-mini (High Reasoning)",
      description: "Cost-effective deep reasoning for STEM & logic",
    },
    { id: "o1", label: "o1 (Reasoning)", description: "Comprehensive reasoning model" },
    { id: "o1-mini", label: "o1-mini", description: "Fast specialized coding reasoning" },
    { id: "gpt-4o-mini", label: "GPT-4o Mini", description: "Lightweight fast assistant" },
  ],
  opencode: [
    {
      id: "deepseek-r1",
      label: "DeepSeek R1 (Reasoning)",
      description: "Open weights frontier reasoning",
      isDefault: true,
    },
    { id: "deepseek-v3", label: "DeepSeek V3", description: "High throughput general coding" },
    {
      id: "qwen-2.5-coder-32b",
      label: "Qwen 2.5 Coder 32B",
      description: "Specialized code generation",
    },
    {
      id: "llama-3.3-70b",
      label: "Llama 3.3 70B Instruct",
      description: "General multipurpose open model",
    },
    { id: "codellama-70b", label: "CodeLlama 70B", description: "Specialized code model" },
    {
      id: "mistral-large",
      label: "Mistral Large",
      description: "High capability multilingual model",
    },
  ],
  omp: [
    {
      id: "default",
      label: "Oh My Pi Default",
      description: "Autonomous workflow runner",
      isDefault: true,
    },
    { id: "autopilot", label: "OmA Autopilot", description: "Full-auto staged loop" },
    { id: "ralph", label: "OmA Ralph Mode", description: "Strict quality-gated verification" },
    { id: "ultrawork", label: "OmA Ultrawork", description: "High-throughput batch delivery" },
  ],
  grok: [
    { id: "grok-2", label: "Grok 2", description: "xAI reasoning engine", isDefault: true },
    { id: "grok-2-mini", label: "Grok 2 Mini", description: "Fast lightweight Grok" },
    { id: "grok-beta", label: "Grok Beta", description: "Realtime knowledge model" },
  ],
};

// Antigravity alias maps to Gemini
DEFAULT_PROVIDER_MODELS.antigravity = DEFAULT_PROVIDER_MODELS.gemini;

function resolveProviderId(provider: string): string {
  if (provider === "antigravity") return "gemini";
  return provider;
}

type AgentHandle = ReturnType<PluginHandlerContext["paseo"]["agents"]["ref"]>;

function getField(value: unknown, key: string): unknown {
  if (typeof value !== "object" || value === null) return undefined;
  return Reflect.get(value, key);
}

function getString(value: unknown, key: string): string | undefined {
  const field = getField(value, key);
  return typeof field === "string" && field.length > 0 ? field : undefined;
}

function textOf(value: unknown): string | undefined {
  if (typeof value === "string") return value.length > 0 ? value : undefined;
  if (value === undefined || value === null) return undefined;
  return getString(value, "text") ?? JSON.stringify(value);
}

function replyFromResult(result: unknown): string | undefined {
  return (
    textOf(getField(result, "lastMessage")) ??
    textOf(getField(getField(getField(result, "final"), "activeTurn"), "output"))
  );
}

function latestAssistantText(timeline: unknown): string | undefined {
  const items = getField(timeline, "items");
  if (!Array.isArray(items)) return undefined;
  const turns: unknown[] = items.filter(
    (item: unknown) =>
      getField(item, "type") === "assistant" || getField(item, "role") === "assistant",
  );
  if (turns.length === 0) return undefined;
  const latest = turns[turns.length - 1];
  return getString(latest, "text") ?? getString(latest, "content") ?? "Completed turn.";
}

export function registerTeamRpcs(server: PluginServerContext, store: TeamStore) {
  server.handle(listTeamsRpc, async ({ projectId }) => {
    const teams = await store.listTeams(projectId);
    return { teams };
  });

  server.handle(getTeamRpc, async ({ teamId }) => {
    const team = await store.getTeam(teamId);
    return { team };
  });

  server.handle(createTeamRpc, async (params) => {
    const team = await store.createTeam(params);
    return { team };
  });

  server.handle(deleteTeamRpc, async ({ teamId }) => {
    const success = await store.deleteTeam(teamId);
    return { success };
  });

  server.handle(listTasksRpc, async ({ teamId }) => {
    const tasks = await store.listTasks(teamId);
    return { tasks };
  });

  server.handle(createTaskRpc, async (params) => {
    const task = await store.createTask(params);
    return { task };
  });

  server.handle(updateTaskStatusRpc, async (params) => {
    const task = await store.updateTaskStatus(params);
    return { task };
  });

  server.handle(listMailboxRpc, async ({ teamId, slotId }) => {
    const messages = await store.listMailbox(teamId, slotId);
    return { messages };
  });

  server.handle(sendMailboxRpc, async (params) => {
    const message = await store.sendMailbox(params);
    return { message };
  });

  server.handle(listProvidersRpc, async (_, context) => {
    try {
      const snap = await context.paseo.providers.snapshot();

      if (snap.entries.length > 0) {
        const providers: ProviderOption[] = snap.entries.map((entry) => {
          const id = entry.provider;
          const resolvedId = resolveProviderId(id);
          const snapshotModels = entry.models ?? [];
          const models =
            snapshotModels.length > 0
              ? snapshotModels.map((m) => ({
                  id: m.id,
                  label: m.label,
                  description: m.description,
                  isDefault: m.isDefault,
                }))
              : (DEFAULT_PROVIDER_MODELS[resolvedId] ??
                DEFAULT_PROVIDER_MODELS[id] ?? [
                  { id: "default", label: "Default Model", isDefault: true },
                ]);

          return { id, name: entry.label ?? id, status: entry.status, models };
        });

        // Ensure gemini and claude are included if missing
        if (!providers.some((p) => p.id === "gemini" || p.id === "antigravity")) {
          providers.push({
            id: "gemini",
            name: "Google Gemini",
            status: "available",
            models: DEFAULT_PROVIDER_MODELS.gemini!,
          });
        }

        return { providers };
      }
    } catch (e) {
      console.warn("Failed to query Paseo providers snapshot:", e);
    }

    // Default rich providers list
    return {
      providers: [
        {
          id: "gemini",
          name: "Google Gemini",
          status: "available",
          models: DEFAULT_PROVIDER_MODELS.gemini!,
        },
        {
          id: "claude",
          name: "Claude Code",
          status: "available",
          models: DEFAULT_PROVIDER_MODELS.claude!,
        },
        {
          id: "codex",
          name: "OpenAI Codex",
          status: "available",
          models: DEFAULT_PROVIDER_MODELS.codex!,
        },
        {
          id: "opencode",
          name: "OpenCode",
          status: "available",
          models: DEFAULT_PROVIDER_MODELS.opencode!,
        },
        { id: "omp", name: "Oh My Pi", status: "available", models: DEFAULT_PROVIDER_MODELS.omp! },
        {
          id: "grok",
          name: "xAI Grok",
          status: "available",
          models: DEFAULT_PROVIDER_MODELS.grok!,
        },
      ],
    };
  });

  server.handle(sendTeamPromptRpc, async ({ teamId, slotId, prompt, attachments }, context) => {
    const team = await store.getTeam(teamId);
    if (!team) throw new Error("Team not found");

    const slot = team.slots.find((s) => s.slotId === slotId);
    if (!slot) throw new Error("Slot not found");

    // 1. Add user message to store (including attachments)
    const userMsg = await store.addMessage({
      teamId,
      slotId,
      sender: "user",
      content: prompt,
      attachments,
    });

    // 2. Set slot status to busy
    await store.updateSlotStatus(teamId, slotId, "busy");

    // 3. Resolve provider & model
    const resolvedProvider = resolveProviderId(slot.provider);
    const providerConfig = slot.model ? `${resolvedProvider}/${slot.model}` : resolvedProvider;

    // 4. Dispatch to Paseo agent in background
    (async () => {
      try {
        let agentRef: AgentHandle;

        if (!slot.agentId) {
          // Create new Paseo agent for this slot
          const systemPrompt =
            slot.role === "leader"
              ? `You are the Leader (Orchestrator) of team "${team.name}".
Your responsibility is to analyze the user's goal, break it down into clear actionable tasks, assign them to teammate slots, and coordinate progress.
When delegating tasks, clearly specify task titles and assignee names.`
              : `You are teammate "${slot.name}" in team "${team.name}".
Execute the assigned tasks diligently, write clean code and tests, and report your results.`;

          const createdAgent = await context.paseo.agents.create({
            cwd: process.cwd(),
            title: `[${team.name}] ${slot.name}`,
            config: {
              provider: providerConfig,
              systemPrompt,
            },
            prompt,
          });

          await store.updateSlotAgentId(teamId, slotId, createdAgent.id);
          agentRef = createdAgent;
        } else {
          agentRef = context.paseo.agents.ref(slot.agentId);
          await agentRef.send(prompt);
        }

        // Wait for turn completion
        const result = await agentRef.waitForFinish(180000); // 3 min timeout
        let content = replyFromResult(result);
        if (content === undefined) {
          // Refetch timeline if direct message not present
          const timeline = await agentRef.timeline.refetch({ limit: 10 });
          content = latestAssistantText(timeline) ?? `Task processed successfully by ${slot.name}.`;
        }
        await store.addMessage({ teamId, slotId, sender: "agent", content });

        await store.updateSlotStatus(teamId, slotId, "idle");
      } catch (err) {
        console.error("Agent execution error:", err);
        await store.addMessage({
          teamId,
          slotId,
          sender: "system",
          content: `Notice: ${err instanceof Error ? err.message : String(err)}`,
        });
        await store.updateSlotStatus(teamId, slotId, "error");
      }
    })();

    return {
      success: true,
      message: userMsg,
    };
  });

  server.handle(listTeamMessagesRpc, async ({ teamId, slotId }) => {
    const messages = await store.listMessages(teamId, slotId);
    return { messages };
  });

  server.handle(updateSlotProviderRpc, async ({ teamId, slotId, provider, model }) => {
    const resolvedProvider = resolveProviderId(provider);
    const team = await store.updateSlotProvider(teamId, slotId, resolvedProvider, model);
    return { team };
  });
}
