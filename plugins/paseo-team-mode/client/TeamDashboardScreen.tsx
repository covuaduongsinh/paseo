import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import {
  listTeamsRpc,
  createTeamRpc,
  deleteTeamRpc,
  listTasksRpc,
  listTeamMessagesRpc,
  sendTeamPromptRpc,
  listProvidersRpc,
  updateSlotProviderRpc,
  type TeamConfig,
  type TeamTask,
  type ChatMessage,
  type ProviderOption,
} from "../shared/contracts.js";
import { ParallelChatView } from "./components/ParallelChatView.js";
import { SingleChatView } from "./components/SingleChatView.js";
import { KanbanBoard } from "./components/KanbanBoard.js";
import { TeamCreateModal, type NewTeamInput } from "./components/TeamCreateModal.js";

type ViewMode = "parallel" | "single" | "kanban";

export function TeamDashboardScreen({ theme }: PluginSurfaceProps) {
  const [teams, setTeams] = useState<TeamConfig[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("parallel");
  const [activeSlotId, setActiveSlotId] = useState<string | undefined>(undefined);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const listTeams = useRpc(listTeamsRpc);
  const createTeam = useRpc(createTeamRpc);
  const deleteTeam = useRpc(deleteTeamRpc);
  const listTasks = useRpc(listTasksRpc);
  const listMessages = useRpc(listTeamMessagesRpc);
  const sendPrompt = useRpc(sendTeamPromptRpc);
  const listProviders = useRpc(listProvidersRpc);
  const updateSlotProvider = useRpc(updateSlotProviderRpc);

  // The host does not pass a project to plugin surfaces, so all teams share one bucket.
  const currentProjectId = "default";

  const fetchProviders = useCallback(async () => {
    try {
      const res = await listProviders({});
      if (res.providers.length > 0) {
        setProviders(res.providers);
      }
    } catch (e) {
      console.error("Failed to load providers:", e);
    }
  }, [listProviders]);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await listTeams({ projectId: currentProjectId });
      setTeams(res.teams);
      if (res.teams.length > 0 && !selectedTeamId) {
        setSelectedTeamId(res.teams[0]!.id);
        setActiveSlotId(res.teams[0]!.slots[0]?.slotId);
      }
    } catch (e) {
      console.error("Failed to load teams:", e);
    }
  }, [currentProjectId, listTeams, selectedTeamId]);

  const fetchTasks = useCallback(
    async (teamId: string) => {
      try {
        const res = await listTasks({ teamId });
        setTasks(res.tasks);
      } catch (e) {
        console.error("Failed to load tasks:", e);
      }
    },
    [listTasks],
  );

  const fetchMessages = useCallback(
    async (teamId: string) => {
      try {
        const res = await listMessages({ teamId });
        setMessages(res.messages);
      } catch (e) {
        console.error("Failed to load messages:", e);
      }
    },
    [listMessages],
  );

  useEffect(() => {
    fetchProviders();
    fetchTeams();
  }, [fetchProviders, fetchTeams]);

  useEffect(() => {
    if (selectedTeamId) {
      fetchTasks(selectedTeamId);
      fetchMessages(selectedTeamId);

      const interval = setInterval(() => {
        fetchMessages(selectedTeamId);
        fetchTasks(selectedTeamId);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [selectedTeamId, fetchTasks, fetchMessages]);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const activeSlot =
    selectedTeam?.slots.find((s) => s.slotId === activeSlotId) ?? selectedTeam?.slots[0];

  const renderWorkArea = () => {
    if (!selectedTeam) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>
            No Team Configured
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.foregroundMuted }]}>
            Create a multi-agent team to enable Leader orchestration, parallel teammates, and task
            boards.
          </Text>
          <Pressable
            onPress={() => setShowCreateModal(true)}
            style={[styles.actionBtn, styles.primaryBtn]}
          >
            <Text style={{ color: "#ffffff", fontWeight: "bold" }}>+ Create Your First Team</Text>
          </Pressable>
        </View>
      );
    }
    if (viewMode === "parallel") {
      return (
        <ParallelChatView
          team={selectedTeam}
          messages={messages}
          providers={providers}
          theme={theme}
          activeSlotId={activeSlotId}
          onSelectSlot={setActiveSlotId}
          onSendPrompt={handleSendPrompt}
          onChangeProvider={handleChangeProvider}
        />
      );
    }
    if (viewMode === "single" && activeSlot) {
      return (
        <SingleChatView
          team={selectedTeam}
          slot={activeSlot}
          messages={messages}
          providers={providers}
          theme={theme}
          onSelectSlot={setActiveSlotId}
          onSendPrompt={handleSendPrompt}
          onChangeProvider={handleChangeProvider}
        />
      );
    }
    return <KanbanBoard tasks={tasks} slots={selectedTeam.slots} theme={theme} />;
  };

  const handleCreateTeam = async (params: NewTeamInput) => {
    try {
      const res = await createTeam({
        projectId: currentProjectId,
        ...params,
      });
      await fetchTeams();
      setSelectedTeamId(res.team.id);
      setActiveSlotId(res.team.slots[0]?.slotId);
    } catch (e) {
      console.error("Failed to create team:", e);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      await deleteTeam({ teamId });
      await fetchTeams();
      if (selectedTeamId === teamId) {
        setSelectedTeamId(null);
      }
    } catch (e) {
      console.error("Failed to delete team:", e);
    }
  };

  const handleSendPrompt = async (
    slotId: string,
    prompt: string,
    attachments?: import("../shared/contracts.js").ChatAttachment[],
  ) => {
    if (!selectedTeamId) return;
    try {
      await sendPrompt({
        teamId: selectedTeamId,
        slotId,
        prompt,
        attachments,
      });
      await fetchMessages(selectedTeamId);
      await fetchTasks(selectedTeamId);
    } catch (e) {
      console.error("Failed to send prompt:", e);
    }
  };

  const handleChangeProvider = async (slotId: string, provider: string, model?: string) => {
    if (!selectedTeamId) return;
    try {
      const res = await updateSlotProvider({
        teamId: selectedTeamId,
        slotId,
        provider,
        model,
      });
      setTeams((prev) => prev.map((t) => (t.id === selectedTeamId ? res.team : t)));
    } catch (e) {
      console.error("Failed to update slot provider:", e);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.surface0 }]}>
      {/* Top Header Bar */}
      <View
        style={[
          styles.headerBar,
          {
            backgroundColor: theme.colors.surface1,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.teamSelectorArea}>
          <Text style={[styles.screenTitle, { color: theme.colors.foreground }]}>👥 Teams</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teamsList}>
            {teams.map((t) => {
              const isSelected = t.id === selectedTeamId;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => {
                    setSelectedTeamId(t.id);
                    setActiveSlotId(t.slots[0]?.slotId);
                  }}
                  style={[
                    styles.teamPill,
                    {
                      backgroundColor: isSelected
                        ? "rgba(99, 102, 241, 0.15)"
                        : theme.colors.surface2,
                      borderColor: isSelected ? "#6366f1" : theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.teamPillText,
                      { color: isSelected ? "#818cf8" : theme.colors.foreground },
                    ]}
                  >
                    {t.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            onPress={() => setShowCreateModal(true)}
            style={[styles.newTeamBtn, { borderColor: "#6366f1" }]}
          >
            <Text style={styles.newTeamBtnText}>+ New Team</Text>
          </Pressable>
        </View>

        {selectedTeam ? (
          <View style={styles.viewToggleArea}>
            <Pressable
              onPress={() => setViewMode("parallel")}
              style={[
                styles.toggleBtn,
                viewMode === "parallel" && styles.toggleBtnActive,
                { borderColor: theme.colors.border },
              ]}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  {
                    color: viewMode === "parallel" ? "#6366f1" : theme.colors.foregroundMuted,
                  },
                ]}
              >
                Parallel Chat
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setViewMode("single")}
              style={[
                styles.toggleBtn,
                viewMode === "single" && styles.toggleBtnActive,
                { borderColor: theme.colors.border },
              ]}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  {
                    color: viewMode === "single" ? "#6366f1" : theme.colors.foregroundMuted,
                  },
                ]}
              >
                Single Focus ({activeSlot?.name ?? "Agent"})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setViewMode("kanban")}
              style={[
                styles.toggleBtn,
                viewMode === "kanban" && styles.toggleBtnActive,
                { borderColor: theme.colors.border },
              ]}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  {
                    color: viewMode === "kanban" ? "#6366f1" : theme.colors.foregroundMuted,
                  },
                ]}
              >
                Activity Kanban ({tasks.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleDeleteTeam(selectedTeam.id)}
              style={styles.deleteTeamBtn}
            >
              <Text style={styles.deleteTeamText}>Delete</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Main Content Area */}
      <View style={styles.contentArea}>{renderWorkArea()}</View>

      {showCreateModal && (
        <TeamCreateModal
          visible={showCreateModal}
          theme={theme}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateTeam}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  teamSelectorArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  teamsList: {
    flexGrow: 0,
  },
  teamPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 8,
  },
  teamPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  newTeamBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  newTeamBtnText: {
    fontSize: 12,
    color: "#818cf8",
    fontWeight: "600",
  },
  viewToggleArea: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  toggleBtnActive: {
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    borderColor: "#6366f1",
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  deleteTeamBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  deleteTeamText: {
    fontSize: 12,
    color: "#ef4444",
  },
  contentArea: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 400,
    lineHeight: 20,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
    marginTop: 8,
  },
  primaryBtn: {
    backgroundColor: "#6366f1",
  },
});
