import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import type {
  TeamConfig,
  TeamSlot,
  TeamTask,
  TeamTaskStatus,
  MailboxMessage,
  ChatMessage,
} from "../shared/contracts.js";

interface TeamDatabase {
  teams: Record<string, TeamConfig>;
  tasks: Record<string, TeamTask>;
  mailbox: MailboxMessage[];
  messages: ChatMessage[];
}

export class TeamStore {
  private dbPath: string;
  private data: TeamDatabase = { teams: {}, tasks: {}, mailbox: [], messages: [] };
  private initialized = false;

  constructor(customPath?: string) {
    const home = os.homedir();
    this.dbPath =
      customPath ?? path.join(home, ".paseo", "plugins", "paseo-team-mode", "teams-data.json");
  }

  private async ensureInitialized() {
    if (this.initialized) return;
    try {
      await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
      const raw = await fs.readFile(this.dbPath, "utf8");
      this.data = JSON.parse(raw);
      if (!this.data.messages) this.data.messages = [];
    } catch {
      this.data = { teams: {}, tasks: {}, mailbox: [], messages: [] };
      await this.save();
    }
    this.initialized = true;
  }

  private async save() {
    await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2), "utf8");
  }

  async listTeams(projectId: string): Promise<TeamConfig[]> {
    await this.ensureInitialized();
    return Object.values(this.data.teams).filter((t) => t.projectId === projectId);
  }

  async getTeam(teamId: string): Promise<TeamConfig | null> {
    await this.ensureInitialized();
    return this.data.teams[teamId] ?? null;
  }

  async createTeam(params: {
    projectId: string;
    name: string;
    description?: string;
    workspaceIsolation?: "shared" | "worktree";
    slots: Array<Omit<TeamSlot, "slotId" | "status">>;
  }): Promise<TeamConfig> {
    await this.ensureInitialized();
    const teamId = `team_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();

    const formattedSlots: TeamSlot[] = params.slots.map((s, idx) => ({
      slotId: `slot_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      name: s.name,
      role: s.role,
      provider: s.provider,
      model: s.model,
      instruction: s.instruction,
      colorIndex: s.colorIndex ?? idx,
      status: "idle",
    }));

    const team: TeamConfig = {
      id: teamId,
      projectId: params.projectId,
      name: params.name,
      description: params.description,
      workspaceIsolation: params.workspaceIsolation ?? "shared",
      slots: formattedSlots,
      createdAt: now,
      updatedAt: now,
    };

    this.data.teams[teamId] = team;
    await this.save();
    return team;
  }

  async updateSlotAgentId(teamId: string, slotId: string, agentId: string) {
    await this.ensureInitialized();
    const team = this.data.teams[teamId];
    if (!team) return;
    const slot = team.slots.find((s) => s.slotId === slotId);
    if (slot) {
      slot.agentId = agentId;
      team.updatedAt = Date.now();
      await this.save();
    }
  }

  async updateSlotStatus(teamId: string, slotId: string, status: "idle" | "busy" | "waiting_approval" | "error") {
    await this.ensureInitialized();
    const team = this.data.teams[teamId];
    if (!team) return;
    const slot = team.slots.find((s) => s.slotId === slotId);
    if (slot) {
      slot.status = status;
      team.updatedAt = Date.now();
      await this.save();
    }
  }

  async updateSlotProvider(teamId: string, slotId: string, provider: string, model?: string): Promise<TeamConfig> {
    await this.ensureInitialized();
    const team = this.data.teams[teamId];
    if (!team) throw new Error(`Team ${teamId} not found`);
    const slot = team.slots.find((s) => s.slotId === slotId);
    if (!slot) throw new Error(`Slot ${slotId} not found`);

    slot.provider = provider;
    if (model !== undefined) slot.model = model;
    // reset agentId so next message spawns with new provider
    slot.agentId = undefined;
    team.updatedAt = Date.now();
    await this.save();
    return team;
  }

  async deleteTeam(teamId: string): Promise<boolean> {
    await this.ensureInitialized();
    delete this.data.teams[teamId];
    for (const taskId of Object.keys(this.data.tasks)) {
      if (this.data.tasks[taskId]?.teamId === teamId) {
        delete this.data.tasks[taskId];
      }
    }
    this.data.mailbox = this.data.mailbox.filter((m) => m.teamId !== teamId);
    this.data.messages = this.data.messages.filter((m) => m.teamId !== teamId);
    await this.save();
    return true;
  }

  async listTasks(teamId: string): Promise<TeamTask[]> {
    await this.ensureInitialized();
    return Object.values(this.data.tasks).filter((t) => t.teamId === teamId);
  }

  async createTask(params: {
    teamId: string;
    title: string;
    description: string;
    assignedSlotId?: string;
  }): Promise<TeamTask> {
    await this.ensureInitialized();
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();

    const task: TeamTask = {
      id: taskId,
      teamId: params.teamId,
      title: params.title,
      description: params.description,
      assignedSlotId: params.assignedSlotId,
      status: "backlog",
      createdAt: now,
      updatedAt: now,
    };

    this.data.tasks[taskId] = task;
    await this.save();
    return task;
  }

  async updateTaskStatus(params: {
    taskId: string;
    status: TeamTaskStatus;
    blockerReason?: string;
    resultSummary?: string;
  }): Promise<TeamTask> {
    await this.ensureInitialized();
    const task = this.data.tasks[params.taskId];
    if (!task) {
      throw new Error(`Task ${params.taskId} not found`);
    }

    task.status = params.status;
    if (params.blockerReason !== undefined) task.blockerReason = params.blockerReason;
    if (params.resultSummary !== undefined) task.resultSummary = params.resultSummary;
    task.updatedAt = Date.now();

    await this.save();
    return task;
  }

  async sendMailbox(params: {
    teamId: string;
    fromSlotId: string;
    toSlotId: string;
    content: string;
  }): Promise<MailboxMessage> {
    await this.ensureInitialized();
    const msg: MailboxMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      teamId: params.teamId,
      fromSlotId: params.fromSlotId,
      toSlotId: params.toSlotId,
      content: params.content,
      timestamp: Date.now(),
      read: false,
    };

    this.data.mailbox.push(msg);
    await this.save();
    return msg;
  }

  async listMailbox(teamId: string, slotId?: string): Promise<MailboxMessage[]> {
    await this.ensureInitialized();
    return this.data.mailbox.filter((m) => {
      if (m.teamId !== teamId) return false;
      if (slotId && m.toSlotId !== slotId && m.fromSlotId !== slotId) return false;
      return true;
    });
  }

  async addMessage(params: {
    teamId: string;
    slotId: string;
    sender: "user" | "agent" | "system";
    content: string;
    attachments?: import("../shared/contracts.js").ChatAttachment[];
  }): Promise<ChatMessage> {
    await this.ensureInitialized();
    const msg: ChatMessage = {
      id: `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      teamId: params.teamId,
      slotId: params.slotId,
      sender: params.sender,
      content: params.content,
      attachments: params.attachments,
      timestamp: Date.now(),
    };

    this.data.messages.push(msg);
    await this.save();
    return msg;
  }

  async listMessages(teamId: string, slotId?: string): Promise<ChatMessage[]> {
    await this.ensureInitialized();
    return this.data.messages.filter((m) => {
      if (m.teamId !== teamId) return false;
      if (slotId && m.slotId !== slotId) return false;
      return true;
    });
  }
}
