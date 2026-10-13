import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { listProvidersRpc, type TeamRole, type ProviderOption } from "../../shared/contracts.js";
import { MEMBER_COLOR_PALETTE } from "../theme/member-colors.js";

interface TeamCreateModalProps {
  visible: boolean;
  theme: PluginSurfaceProps["theme"];
  onClose: () => void;
  onCreate: (team: {
    name: string;
    description?: string;
    workspaceIsolation: "shared" | "worktree";
    slots: Array<{
      name: string;
      role: TeamRole;
      provider: string;
      model?: string;
      instruction?: string;
      colorIndex: number;
    }>;
  }) => void;
}

export function TeamCreateModal({ visible, theme, onClose, onCreate }: TeamCreateModalProps) {
  if (!visible) return null;

  const [teamName, setTeamName] = useState("");
  const [isolation, setIsolation] = useState<"shared" | "worktree">("shared");
  const [leaderProvider, setLeaderProvider] = useState("claude");
  const [leaderModel, setLeaderModel] = useState("claude-3-7-sonnet");
  const [availableProviders, setAvailableProviders] = useState<ProviderOption[]>([]);

  const listProviders = useRpc(listProvidersRpc);

  useEffect(() => {
    listProviders({})
      .then((res) => {
        if (res.providers.length > 0) {
          setAvailableProviders(res.providers);
          if (!res.providers.some((p) => p.id === leaderProvider)) {
            setLeaderProvider(res.providers[0]!.id);
            const firstModel = res.providers[0]!.models?.[0]?.id ?? "default";
            setLeaderModel(firstModel);
          }
        }
      })
      .catch((err) => console.error("Failed to load providers:", err));
  }, [listProviders]);

  const [teammates, setTeammates] = useState<
    Array<{ name: string; provider: string; model?: string; colorIndex: number }>
  >([
    { name: "Coder Agent", provider: "codex", model: "gpt-4o", colorIndex: 1 },
    { name: "Reviewer Agent", provider: "claude", model: "claude-3-7-sonnet", colorIndex: 2 },
  ]);

  const providerList =
    availableProviders.length > 0
      ? availableProviders
      : [
          {
            id: "claude",
            name: "Claude Code",
            status: "available",
            models: [{ id: "claude-3-7-sonnet", label: "Claude 3.7 Sonnet" }, { id: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" }],
          },
          {
            id: "antigravity",
            name: "Antigravity",
            status: "available",
            models: [{ id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" }, { id: "claude-3-7-sonnet", label: "Claude 3.7 Sonnet" }],
          },
          {
            id: "codex",
            name: "Codex",
            status: "available",
            models: [{ id: "gpt-4o", label: "GPT-4o" }, { id: "o3-mini", label: "o3-mini" }],
          },
          {
            id: "opencode",
            name: "OpenCode",
            status: "available",
            models: [{ id: "deepseek-r1", label: "DeepSeek R1" }, { id: "qwen-2.5-coder-32b", label: "Qwen 2.5 Coder" }],
          },
        ];

  const handleAddTeammate = () => {
    const nextIdx = (teammates.length + 1) % MEMBER_COLOR_PALETTE.length;
    const defaultProvider = providerList[0]?.id ?? "claude";
    const defaultModel = providerList[0]?.models?.[0]?.id ?? "default";
    setTeammates([
      ...teammates,
      {
        name: `Teammate ${teammates.length + 1}`,
        provider: defaultProvider,
        model: defaultModel,
        colorIndex: nextIdx,
      },
    ]);
  };

  const handleRemoveTeammate = (index: number) => {
    setTeammates(teammates.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!teamName.trim()) return;

    const slots = [
      {
        name: "Leader",
        role: "leader" as TeamRole,
        provider: leaderProvider,
        model: leaderModel,
        colorIndex: 0,
      },
      ...teammates.map((tm) => ({
        name: tm.name,
        role: "teammate" as TeamRole,
        provider: tm.provider,
        model: tm.model,
        colorIndex: tm.colorIndex,
      })),
    ];

    onCreate({
      name: teamName,
      workspaceIsolation: isolation,
      slots,
    });
    onClose();
  };

  const currentLeaderProviderObj = providerList.find((p) => p.id === leaderProvider);

  return (
    <View style={styles.backdrop}>
      <View
        style={[
          styles.modalContainer,
          {
            backgroundColor: theme.colors.surface1,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
          <Text style={[styles.title, { color: theme.colors.foreground }]}>Create New Team</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={[styles.closeIcon, { color: theme.colors.foregroundMuted }]}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scrollArea}>
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.colors.foreground }]}>Team Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.colors.foreground,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface2,
                },
              ]}
              placeholder="e.g. Fullstack Feature Team"
              placeholderTextColor={theme.colors.foregroundMuted}
              value={teamName}
              onChangeText={setTeamName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.colors.foreground }]}>
              Workspace Mode
            </Text>
            <View style={styles.radioRow}>
              <Pressable
                style={[
                  styles.radioBtn,
                  isolation === "shared" && styles.radioBtnActive,
                  { borderColor: theme.colors.border },
                ]}
                onPress={() => setIsolation("shared")}
              >
                <Text
                  style={[
                    styles.radioText,
                    {
                      color:
                        isolation === "shared" ? "#6366f1" : theme.colors.foregroundMuted,
                    },
                  ]}
                >
                  Shared Workspace
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.radioBtn,
                  isolation === "worktree" && styles.radioBtnActive,
                  { borderColor: theme.colors.border },
                ]}
                onPress={() => setIsolation("worktree")}
              >
                <Text
                  style={[
                    styles.radioText,
                    {
                      color:
                        isolation === "worktree" ? "#6366f1" : theme.colors.foregroundMuted,
                    },
                  ]}
                >
                  Git Worktree Isolation
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Leader Configuration */}
          <View
            style={[
              styles.memberSection,
              { backgroundColor: theme.colors.surface2, borderColor: "#6366f1" },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: "#818cf8" }]}>👑 Leader (Orchestrator)</Text>
            </View>

            <Text style={[styles.sublabel, { color: theme.colors.foregroundMuted }]}>
              Select Provider:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.providerScroll}>
              {providerList.map((p) => {
                const isSelected = leaderProvider === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      setLeaderProvider(p.id);
                      if (p.models && p.models.length > 0) {
                        setLeaderModel(p.models[0]!.id);
                      }
                    }}
                    style={[
                      styles.providerChip,
                      isSelected && styles.providerChipActive,
                      { borderColor: isSelected ? "#6366f1" : theme.colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.providerChipText,
                        { color: isSelected ? "#818cf8" : theme.colors.foreground },
                      ]}
                    >
                      {p.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.sublabel, { color: theme.colors.foregroundMuted, marginTop: 8 }]}>
              Select Model:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.providerScroll}>
              {currentLeaderProviderObj?.models?.map((m) => {
                const isSelected = leaderModel === m.id;
                return (
                  <Pressable
                    key={m.id}
                    onPress={() => setLeaderModel(m.id)}
                    style={[
                      styles.modelChip,
                      isSelected && styles.modelChipActive,
                      { borderColor: isSelected ? "#6366f1" : theme.colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modelChipText,
                        { color: isSelected ? "#818cf8" : theme.colors.foregroundMuted },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Teammates Configuration */}
          <View style={styles.formGroup}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.label, { color: theme.colors.foreground }]}>
                Teammates ({teammates.length})
              </Text>
              <Pressable onPress={handleAddTeammate} style={styles.addBtn}>
                <Text style={styles.addBtnText}>+ Add Teammate</Text>
              </Pressable>
            </View>

            {teammates.map((tm, idx) => {
              const tmProviderObj = providerList.find((p) => p.id === tm.provider);
              return (
                <View
                  key={idx}
                  style={[
                    styles.memberCard,
                    {
                      backgroundColor: theme.colors.surface2,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1, gap: 6 }}>
                    <TextInput
                      style={[
                        styles.inputSmall,
                        {
                          color: theme.colors.foreground,
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.surface1,
                        },
                      ]}
                      value={tm.name}
                      onChangeText={(val) => {
                        const copy = [...teammates];
                        copy[idx]!.name = val;
                        setTeammates(copy);
                      }}
                      placeholder="Teammate Name"
                      placeholderTextColor={theme.colors.foregroundMuted}
                    />

                    {/* Provider selector for teammate */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {providerList.map((p) => {
                        const isSelected = tm.provider === p.id;
                        return (
                          <Pressable
                            key={p.id}
                            onPress={() => {
                              const copy = [...teammates];
                              copy[idx]!.provider = p.id;
                              if (p.models && p.models.length > 0) {
                                copy[idx]!.model = p.models[0]!.id;
                              }
                              setTeammates(copy);
                            }}
                            style={[
                              styles.providerChipMini,
                              isSelected && styles.providerChipMiniActive,
                              { borderColor: isSelected ? "#10b981" : theme.colors.border },
                            ]}
                          >
                            <Text
                              style={[
                                styles.providerChipTextMini,
                                { color: isSelected ? "#34d399" : theme.colors.foregroundMuted },
                              ]}
                            >
                              {p.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>

                    {/* Model selector for teammate */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {tmProviderObj?.models?.map((m) => {
                        const isSelected = tm.model === m.id;
                        return (
                          <Pressable
                            key={m.id}
                            onPress={() => {
                              const copy = [...teammates];
                              copy[idx]!.model = m.id;
                              setTeammates(copy);
                            }}
                            style={[
                              styles.modelChipMini,
                              isSelected && styles.modelChipMiniActive,
                              { borderColor: isSelected ? "#10b981" : theme.colors.border },
                            ]}
                          >
                            <Text
                              style={[
                                styles.modelChipTextMini,
                                { color: isSelected ? "#34d399" : theme.colors.foregroundMuted },
                              ]}
                            >
                              {m.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <Pressable
                    onPress={() => handleRemoveTeammate(idx)}
                    style={styles.removeBtn}
                  >
                    <Text style={styles.removeBtnText}>✕</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View style={[styles.modalActions, { borderTopColor: theme.colors.border }]}>
          <Pressable
            onPress={onClose}
            style={[styles.actionBtn, { borderColor: theme.colors.border }]}
          >
            <Text style={{ color: theme.colors.foreground }}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleSubmit}
            style={[styles.actionBtn, styles.primaryBtn]}
          >
            <Text style={styles.primaryBtnText}>Create Team</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: "fixed" as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  modalContainer: {
    width: "90%",
    maxWidth: 580,
    maxHeight: "85%",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 6,
  },
  closeIcon: {
    fontSize: 16,
    fontWeight: "600",
  },
  scrollArea: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  sublabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  inputSmall: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
  },
  radioRow: {
    flexDirection: "row",
    gap: 12,
  },
  radioBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  radioBtnActive: {
    borderColor: "#6366f1",
    backgroundColor: "rgba(99, 102, 241, 0.1)",
  },
  radioText: {
    fontSize: 12,
    fontWeight: "600",
  },
  memberSection: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  providerScroll: {
    marginVertical: 4,
  },
  providerChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 6,
  },
  providerChipActive: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
  },
  providerChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  modelChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
    marginRight: 6,
  },
  modelChipActive: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
  },
  modelChipText: {
    fontSize: 10,
    fontWeight: "600",
  },
  addBtn: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  providerChipMini: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 4,
  },
  providerChipMiniActive: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  providerChipTextMini: {
    fontSize: 10,
  },
  modelChipMini: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 4,
  },
  modelChipMiniActive: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  modelChipTextMini: {
    fontSize: 9,
  },
  removeBtn: {
    padding: 6,
  },
  removeBtnText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  primaryBtn: {
    backgroundColor: "#6366f1",
    borderColor: "#6366f1",
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
