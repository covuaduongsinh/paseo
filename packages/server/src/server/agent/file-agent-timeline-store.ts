import { promises as fs } from "node:fs";
import path from "node:path";
import type { Logger } from "pino";
import type {
  AgentTimelineFetchOptions,
  AgentTimelineFetchResult,
  AgentTimelineRow,
  AgentTimelineStore,
} from "./agent-timeline-store-types.js";
import type { AgentTimelineItem } from "./agent-sdk-types.js";
import { InMemoryAgentTimelineStore } from "./agent-timeline-store.js";
import { writeJsonFileAtomic } from "../atomic-file.js";

export class FileAgentTimelineStore implements AgentTimelineStore {
  private readonly memory = new InMemoryAgentTimelineStore();
  private readonly dir: string;
  private readonly logger: Logger;
  private readonly loaded = new Set<string>();
  private readonly pendingSaves = new Map<string, Promise<void>>();

  constructor(dir: string, logger: Logger) {
    this.dir = dir;
    this.logger = logger.child({ module: "agent", component: "file-timeline-store" });
  }

  private getFilePath(agentId: string): string {
    const sanitized = agentId.replace(/[^a-zA-Z0-9_-]/g, "_");
    return path.join(this.dir, `${sanitized}.json`);
  }

  private async ensureLoaded(agentId: string): Promise<void> {
    if (this.loaded.has(agentId)) {
      return;
    }
    this.loaded.add(agentId);
    const filePath = this.getFilePath(agentId);
    try {
      const content = await fs.readFile(filePath, "utf8");
      const rows = JSON.parse(content) as AgentTimelineRow[];
      if (Array.isArray(rows) && rows.length > 0) {
        this.memory.initialize(agentId, { rows });
      } else {
        this.memory.initialize(agentId);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        this.logger.warn({ err: error, agentId }, "Failed to read timeline file from disk");
      }
      if (!this.memory.has(agentId)) {
        this.memory.initialize(agentId);
      }
    }
  }

  private scheduleSave(agentId: string): void {
    const previous = this.pendingSaves.get(agentId) ?? Promise.resolve();
    const savePromise = previous
      .catch(() => undefined)
      .then(async () => {
        const rows = this.memory.getRows(agentId);
        const filePath = this.getFilePath(agentId);
        await fs.mkdir(this.dir, { recursive: true }).catch(() => undefined);
        await writeJsonFileAtomic(filePath, rows);
      })
      .catch((err) => {
        this.logger.error({ err, agentId }, "Failed to save timeline file to disk");
      })
      .finally(() => {
        if (this.pendingSaves.get(agentId) === savePromise) {
          this.pendingSaves.delete(agentId);
        }
      });
    this.pendingSaves.set(agentId, savePromise);
  }

  async appendCommitted(
    agentId: string,
    item: AgentTimelineItem,
    options?: { timestamp?: string; turnId?: string },
  ): Promise<AgentTimelineRow> {
    await this.ensureLoaded(agentId);
    const row = this.memory.append(agentId, item, options);
    this.scheduleSave(agentId);
    return row;
  }

  async fetchCommitted(
    agentId: string,
    options?: AgentTimelineFetchOptions,
  ): Promise<AgentTimelineFetchResult> {
    await this.ensureLoaded(agentId);
    return this.memory.fetch(agentId, options);
  }

  async getLatestCommittedSeq(agentId: string): Promise<number> {
    await this.ensureLoaded(agentId);
    const rows = this.memory.getRows(agentId);
    return rows.length > 0 ? rows[rows.length - 1].seqEnd : 0;
  }

  async getCommittedRows(agentId: string): Promise<AgentTimelineRow[]> {
    await this.ensureLoaded(agentId);
    return this.memory.getRows(agentId).map((r) => ({
      seq: r.seqEnd,
      timestamp: r.timestamp,
      item: r.item,
      ...(r.turnId ? { turnId: r.turnId } : {}),
      ...(r.providerMessageId ? { providerMessageId: r.providerMessageId } : {}),
    }));
  }

  async getLastItem(agentId: string): Promise<AgentTimelineItem | null> {
    await this.ensureLoaded(agentId);
    return this.memory.getLastItem(agentId);
  }

  async getLastAssistantMessage(agentId: string): Promise<string | null> {
    await this.ensureLoaded(agentId);
    return this.memory.getLastAssistantMessage(agentId);
  }

  async deleteAgent(agentId: string): Promise<void> {
    this.memory.delete(agentId);
    this.loaded.delete(agentId);
    const filePath = this.getFilePath(agentId);
    await fs.unlink(filePath).catch(() => undefined);
  }

  async bulkInsert(agentId: string, rows: readonly AgentTimelineRow[]): Promise<void> {
    await this.ensureLoaded(agentId);
    for (const row of rows) {
      this.memory.append(agentId, row.item, {
        timestamp: row.timestamp,
        turnId: row.turnId,
        providerMessageId: row.providerMessageId,
      });
    }
    this.scheduleSave(agentId);
  }

  async updateCommittedRow(agentId: string, row: AgentTimelineRow): Promise<void> {
    await this.ensureLoaded(agentId);
    if (row.item.type === "user_message" && row.item.clientMessageId && row.providerMessageId) {
      this.memory.enrichSubmittedUserMessage(
        agentId,
        row.item.clientMessageId,
        row.providerMessageId,
      );
    }
    this.scheduleSave(agentId);
  }
}
