import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const TeamRoleSchema = z.enum(["leader", "teammate"]);
export type TeamRole = z.infer<typeof TeamRoleSchema>;

export const TeamSlotSchema = z.object({
  slotId: z.string(),
  name: z.string(),
  role: TeamRoleSchema,
  provider: z.string(),
  model: z.string().optional(),
  instruction: z.string().optional(),
  agentId: z.string().optional(),
  colorIndex: z.number().default(0),
  status: z.enum(["idle", "busy", "waiting_approval", "error"]).default("idle"),
});
export type TeamSlot = z.infer<typeof TeamSlotSchema>;

export const TeamTaskStatusSchema = z.enum([
  "backlog",
  "in_progress",
  "blocked",
  "done",
  "failed",
]);
export type TeamTaskStatus = z.infer<typeof TeamTaskStatusSchema>;

export const TeamTaskSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  title: z.string(),
  description: z.string(),
  assignedSlotId: z.string().optional(),
  status: TeamTaskStatusSchema.default("backlog"),
  blockerReason: z.string().optional(),
  resultSummary: z.string().optional(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type TeamTask = z.infer<typeof TeamTaskSchema>;

export const MailboxMessageSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  fromSlotId: z.string(),
  toSlotId: z.string(),
  content: z.string(),
  timestamp: z.number(),
  read: z.boolean().default(false),
});
export type MailboxMessage = z.infer<typeof MailboxMessageSchema>;

export const ChatAttachmentSchema = z.object({
  id: z.string(),
  type: z.literal("image"),
  name: z.string().optional(),
  dataUrl: z.string(),
});
export type ChatAttachment = z.infer<typeof ChatAttachmentSchema>;

export const ChatMessageSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  slotId: z.string(),
  sender: z.enum(["user", "agent", "system"]),
  content: z.string(),
  attachments: z.array(ChatAttachmentSchema).optional(),
  timestamp: z.number(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const TeamConfigSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  workspaceIsolation: z.enum(["shared", "worktree"]).default("shared"),
  slots: z.array(TeamSlotSchema),
  createdAt: z.number(),
  updatedAt: z.number(),
});
export type TeamConfig = z.infer<typeof TeamConfigSchema>;

export const ModelOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
});
export type ModelOption = z.infer<typeof ModelOptionSchema>;

export const ProviderOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  models: z.array(ModelOptionSchema).default([]),
});
export type ProviderOption = z.infer<typeof ProviderOptionSchema>;

// RPC Definitions
export const listTeamsRpc = defineRpc({
  name: "team.list",
  input: z.object({ projectId: z.string() }),
  output: z.object({ teams: z.array(TeamConfigSchema) }),
});

export const getTeamRpc = defineRpc({
  name: "team.get",
  input: z.object({ teamId: z.string() }),
  output: z.object({ team: TeamConfigSchema.nullable() }),
});

export const createTeamRpc = defineRpc({
  name: "team.create",
  input: z.object({
    projectId: z.string(),
    name: z.string(),
    description: z.string().optional(),
    workspaceIsolation: z.enum(["shared", "worktree"]).default("shared"),
    slots: z.array(
      z.object({
        name: z.string(),
        role: TeamRoleSchema,
        provider: z.string(),
        model: z.string().optional(),
        instruction: z.string().optional(),
        colorIndex: z.number().default(0),
      }),
    ),
  }),
  output: z.object({ team: TeamConfigSchema }),
});

export const deleteTeamRpc = defineRpc({
  name: "team.delete",
  input: z.object({ teamId: z.string() }),
  output: z.object({ success: z.boolean() }),
});

export const listTasksRpc = defineRpc({
  name: "team.tasks.list",
  input: z.object({ teamId: z.string() }),
  output: z.object({ tasks: z.array(TeamTaskSchema) }),
});

export const createTaskRpc = defineRpc({
  name: "team.tasks.create",
  input: z.object({
    teamId: z.string(),
    title: z.string(),
    description: z.string(),
    assignedSlotId: z.string().optional(),
  }),
  output: z.object({ task: TeamTaskSchema }),
});

export const updateTaskStatusRpc = defineRpc({
  name: "team.tasks.update-status",
  input: z.object({
    taskId: z.string(),
    status: TeamTaskStatusSchema,
    blockerReason: z.string().optional(),
    resultSummary: z.string().optional(),
  }),
  output: z.object({ task: TeamTaskSchema }),
});

export const listMailboxRpc = defineRpc({
  name: "team.mailbox.list",
  input: z.object({ teamId: z.string(), slotId: z.string().optional() }),
  output: z.object({ messages: z.array(MailboxMessageSchema) }),
});

export const sendMailboxRpc = defineRpc({
  name: "team.mailbox.send",
  input: z.object({
    teamId: z.string(),
    fromSlotId: z.string(),
    toSlotId: z.string(),
    content: z.string(),
  }),
  output: z.object({ message: MailboxMessageSchema }),
});

export const listProvidersRpc = defineRpc({
  name: "team.providers.list",
  input: z.object({}),
  output: z.object({ providers: z.array(ProviderOptionSchema) }),
});

export const sendTeamPromptRpc = defineRpc({
  name: "team.chat.send",
  input: z.object({
    teamId: z.string(),
    slotId: z.string(),
    prompt: z.string(),
    attachments: z.array(ChatAttachmentSchema).optional(),
  }),
  output: z.object({
    success: z.boolean(),
    message: ChatMessageSchema,
  }),
});

export const listTeamMessagesRpc = defineRpc({
  name: "team.chat.messages",
  input: z.object({ teamId: z.string(), slotId: z.string().optional() }),
  output: z.object({ messages: z.array(ChatMessageSchema) }),
});

export const updateSlotProviderRpc = defineRpc({
  name: "team.slots.update-provider",
  input: z.object({
    teamId: z.string(),
    slotId: z.string(),
    provider: z.string(),
    model: z.string().optional(),
  }),
  output: z.object({
    team: TeamConfigSchema,
  }),
});

