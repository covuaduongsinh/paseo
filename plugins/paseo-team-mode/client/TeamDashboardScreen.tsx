import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  type TextStyle,
  type ViewStyle,
} from "react-native";
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
  type ChatAttachment,
  type ChatMessage,
  type ProviderOption,
} from "../shared/contracts.js";
import { ParallelChatView } from "./components/ParallelChatView.js";
import { SingleChatView } from "./components/SingleChatView.js";
import { KanbanBoard } from "./components/KanbanBoard.js";
import { TeamCreateModal, type NewTeamInput } from "./components/TeamCreateModal.js";

type ViewMode = "parallel" | "single" | "kanban";

/** Teams opened from the full screen have no workspace and share this scope. */
export const GLOBAL_TEAM_SCOPE = "default";

export interface TeamDashboardProps extends PluginSurfaceProps {
  /** Present in the workspace panel; teams are then scoped to that workspace. */
  workspaceId?: string;
}

export function TeamDashboardScreen({ theme, workspaceId }: TeamDashboardProps) {
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

  // Stored as `projectId` in team data; the value is the workspace id, or the global scope.
  const currentProjectId = workspaceId ?? GLOBAL_TEAM_SCOPE;

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

  const themed = useMemo(() => createDashboardStyles(theme), [theme]);

  const handleShowCreate = useCallback(() => setShowCreateModal(true), []);
  const handleCloseCreate = useCallback(() => setShowCreateModal(false), []);

  const handleSelectTeam = useCallback((team: TeamConfig) => {
    setSelectedTeamId(team.id);
    setActiveSlotId(team.slots[0]?.slotId);
  }, []);

  const handleCreateTeam = useCallback(
    async (params: NewTeamInput) => {
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
    },
    [createTeam, currentProjectId, fetchTeams],
  );

  const handleDeleteSelectedTeam = useCallback(async () => {
    if (!selectedTeamId) return;
    try {
      await deleteTeam({ teamId: selectedTeamId });
      await fetchTeams();
      setSelectedTeamId(null);
    } catch (e) {
      console.error("Failed to delete team:", e);
    }
  }, [deleteTeam, fetchTeams, selectedTeamId]);

  const handleSendPrompt = useCallback(
    async (slotId: string, prompt: string, attachments?: ChatAttachment[]) => {
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
    },
    [fetchMessages, fetchTasks, selectedTeamId, sendPrompt],
  );

  const handleChangeProvider = useCallback(
    async (slotId: string, provider: string, model?: string) => {
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
    },
    [selectedTeamId, updateSlotProvider],
  );

  const renderWorkArea = () => {
    if (!selectedTeam) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={themed.emptyTitle}>No Team Configured</Text>
          <Text style={themed.emptySubtitle}>
            Create a multi-agent team to enable Leader orchestration, parallel teammates, and task
            boards.
          </Text>
          <Pressable onPress={handleShowCreate} style={EMPTY_ACTION_STYLE}>
            <Text style={styles.primaryBtnText}>+ Create Your First Team</Text>
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

  return (
    <View style={themed.screen}>
      {/* Top Header Bar */}
      <View style={themed.headerBar}>
        <View style={styles.teamSelectorArea}>
          <Text style={themed.screenTitle}>👥 Teams</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.teamsList}>
            {teams.map((t) => (
              <TeamPill
                key={t.id}
                team={t}
                selected={t.id === selectedTeamId}
                themed={themed}
                onSelect={handleSelectTeam}
              />
            ))}
          </ScrollView>

          <Pressable onPress={handleShowCreate} style={styles.newTeamBtn}>
            <Text style={styles.newTeamBtnText}>+ New Team</Text>
          </Pressable>
        </View>

        {selectedTeam ? (
          <View style={styles.viewToggleArea}>
            <ViewToggle
              mode="parallel"
              label="Parallel Chat"
              activeMode={viewMode}
              themed={themed}
              onSelect={setViewMode}
            />
            <ViewToggle
              mode="single"
              label={`Single Focus (${activeSlot?.name ?? "Agent"})`}
              activeMode={viewMode}
              themed={themed}
              onSelect={setViewMode}
            />
            <ViewToggle
              mode="kanban"
              label={`Activity Kanban (${tasks.length})`}
              activeMode={viewMode}
              themed={themed}
              onSelect={setViewMode}
            />

            <Pressable onPress={handleDeleteSelectedTeam} style={styles.deleteTeamBtn}>
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
          onClose={handleCloseCreate}
          onCreate={handleCreateTeam}
        />
      )}
    </View>
  );
}

interface DashboardStyles {
  screen: ViewStyle;
  headerBar: ViewStyle;
  screenTitle: TextStyle;
  emptyTitle: TextStyle;
  emptySubtitle: TextStyle;
  teamPillOn: ViewStyle;
  teamPillOff: ViewStyle;
  teamPillTextOn: TextStyle;
  teamPillTextOff: TextStyle;
  toggleOn: ViewStyle;
  toggleOff: ViewStyle;
  toggleTextOn: TextStyle;
  toggleTextOff: TextStyle;
}

function createDashboardStyles(theme: PluginSurfaceProps["theme"]): DashboardStyles {
  const { colors } = theme;
  const pill = (selected: boolean): ViewStyle =>
    StyleSheet.flatten([
      styles.teamPill,
      {
        backgroundColor: selected ? "rgba(99, 102, 241, 0.15)" : colors.surface2,
        borderColor: selected ? "#6366f1" : colors.border,
      },
    ]);
  const pillText = (selected: boolean): TextStyle =>
    StyleSheet.flatten([styles.teamPillText, { color: selected ? "#818cf8" : colors.foreground }]);
  // The border color comes last on purpose: the active toggle keeps the theme border.
  const toggle = (active: boolean): ViewStyle =>
    StyleSheet.flatten([
      styles.toggleBtn,
      active && styles.toggleBtnActive,
      { borderColor: colors.border },
    ]);
  const toggleText = (active: boolean): TextStyle =>
    StyleSheet.flatten([
      styles.toggleBtnText,
      { color: active ? "#6366f1" : colors.foregroundMuted },
    ]);

  return {
    screen: StyleSheet.flatten([styles.screen, { backgroundColor: colors.surface0 }]),
    headerBar: StyleSheet.flatten([
      styles.headerBar,
      { backgroundColor: colors.surface1, borderBottomColor: colors.border },
    ]),
    screenTitle: StyleSheet.flatten([styles.screenTitle, { color: colors.foreground }]),
    emptyTitle: StyleSheet.flatten([styles.emptyTitle, { color: colors.foreground }]),
    emptySubtitle: StyleSheet.flatten([styles.emptySubtitle, { color: colors.foregroundMuted }]),
    teamPillOn: pill(true),
    teamPillOff: pill(false),
    teamPillTextOn: pillText(true),
    teamPillTextOff: pillText(false),
    toggleOn: toggle(true),
    toggleOff: toggle(false),
    toggleTextOn: toggleText(true),
    toggleTextOff: toggleText(false),
  };
}

interface TeamPillProps {
  team: TeamConfig;
  selected: boolean;
  themed: DashboardStyles;
  onSelect: (team: TeamConfig) => void;
}

function TeamPill({ team, selected, themed, onSelect }: TeamPillProps) {
  const handlePress = useCallback(() => onSelect(team), [onSelect, team]);
  return (
    <Pressable onPress={handlePress} style={selected ? themed.teamPillOn : themed.teamPillOff}>
      <Text style={selected ? themed.teamPillTextOn : themed.teamPillTextOff}>{team.name}</Text>
    </Pressable>
  );
}

interface ViewToggleProps {
  mode: ViewMode;
  label: string;
  activeMode: ViewMode;
  themed: DashboardStyles;
  onSelect: (mode: ViewMode) => void;
}

function ViewToggle({ mode, label, activeMode, themed, onSelect }: ViewToggleProps) {
  const active = mode === activeMode;
  const handlePress = useCallback(() => onSelect(mode), [onSelect, mode]);
  return (
    <Pressable onPress={handlePress} style={active ? themed.toggleOn : themed.toggleOff}>
      <Text style={active ? themed.toggleTextOn : themed.toggleTextOff}>{label}</Text>
    </Pressable>
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
    borderColor: "#6366f1",
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
  primaryBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
});

const EMPTY_ACTION_STYLE = StyleSheet.flatten([styles.actionBtn, styles.primaryBtn]);
