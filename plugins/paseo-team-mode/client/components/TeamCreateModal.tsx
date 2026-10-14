import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { listProvidersRpc, type TeamRole, type ProviderOption } from "../../shared/contracts.js";
import { MEMBER_COLOR_PALETTE } from "../theme/member-colors.js";
import { FIXED_POSITION } from "../theme/overlay.js";

export interface NewTeamInput {
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
}

interface TeamCreateModalProps {
  visible: boolean;
  theme: PluginSurfaceProps["theme"];
  onClose: () => void;
  onCreate: (team: NewTeamInput) => void;
}

interface Teammate {
  key: string;
  name: string;
  provider: string;
  model?: string;
  colorIndex: number;
}

type TeammatePatch = Partial<Omit<Teammate, "key">>;

const DEFAULT_LEADER_PROVIDER = "claude";

function newTeammate(fields: Omit<Teammate, "key">): Teammate {
  return { key: `tm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, ...fields };
}

type Isolation = NewTeamInput["workspaceIsolation"];

const FALLBACK_PROVIDERS: ProviderOption[] = [
  {
    id: "claude",
    name: "Claude Code",
    status: "available",
    models: [
      { id: "claude-3-7-sonnet", label: "Claude 3.7 Sonnet" },
      { id: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
    ],
  },
  {
    id: "antigravity",
    name: "Antigravity",
    status: "available",
    models: [
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { id: "claude-3-7-sonnet", label: "Claude 3.7 Sonnet" },
    ],
  },
  {
    id: "codex",
    name: "Codex",
    status: "available",
    models: [
      { id: "gpt-4o", label: "GPT-4o" },
      { id: "o3-mini", label: "o3-mini" },
    ],
  },
  {
    id: "opencode",
    name: "OpenCode",
    status: "available",
    models: [
      { id: "deepseek-r1", label: "DeepSeek R1" },
      { id: "qwen-2.5-coder-32b", label: "Qwen 2.5 Coder" },
    ],
  },
];

/** The four looks a selectable chip can take: container and text, selected or not. */
interface ChipStyles {
  on: ViewStyle;
  off: ViewStyle;
  textOn: TextStyle;
  textOff: TextStyle;
}

interface CreateModalStyles {
  modalContainer: ViewStyle;
  modalHeader: ViewStyle;
  title: TextStyle;
  closeIcon: TextStyle;
  label: TextStyle;
  input: TextStyle;
  radioOn: ViewStyle;
  radioOff: ViewStyle;
  radioTextOn: TextStyle;
  radioTextOff: TextStyle;
  leaderSection: ViewStyle;
  leaderTitle: TextStyle;
  sublabel: TextStyle;
  sublabelSpaced: TextStyle;
  leaderProviderChip: ChipStyles;
  leaderModelChip: ChipStyles;
  memberCard: ViewStyle;
  inputSmall: TextStyle;
  teammateProviderChip: ChipStyles;
  teammateModelChip: ChipStyles;
  modalActions: ViewStyle;
  cancelBtn: ViewStyle;
  cancelText: TextStyle;
}

function createModalStyles(theme: PluginSurfaceProps["theme"]): CreateModalStyles {
  const { colors } = theme;
  const radio = (active: boolean): ViewStyle =>
    StyleSheet.flatten([
      styles.radioBtn,
      active && styles.radioBtnActive,
      { borderColor: colors.border },
    ]);
  const radioText = (active: boolean): TextStyle =>
    StyleSheet.flatten([styles.radioText, { color: active ? "#6366f1" : colors.foregroundMuted }]);
  const chip = (
    base: ViewStyle,
    active: ViewStyle,
    text: TextStyle,
    palette: { border: string; textOn: string; textOff: string },
  ): ChipStyles => ({
    on: StyleSheet.flatten([base, active, { borderColor: palette.border }]),
    off: StyleSheet.flatten([base, { borderColor: colors.border }]),
    textOn: StyleSheet.flatten([text, { color: palette.textOn }]),
    textOff: StyleSheet.flatten([text, { color: palette.textOff }]),
  });
  const leaderPalette = { border: "#6366f1", textOn: "#818cf8" };
  const teammatePalette = { border: "#10b981", textOn: "#34d399" };

  return {
    modalContainer: StyleSheet.flatten([
      styles.modalContainer,
      { backgroundColor: colors.surface1, borderColor: colors.border },
    ]),
    modalHeader: StyleSheet.flatten([styles.modalHeader, { borderBottomColor: colors.border }]),
    title: StyleSheet.flatten([styles.title, { color: colors.foreground }]),
    closeIcon: StyleSheet.flatten([styles.closeIcon, { color: colors.foregroundMuted }]),
    label: StyleSheet.flatten([styles.label, { color: colors.foreground }]),
    input: StyleSheet.flatten([
      styles.input,
      {
        color: colors.foreground,
        borderColor: colors.border,
        backgroundColor: colors.surface2,
      },
    ]),
    radioOn: radio(true),
    radioOff: radio(false),
    radioTextOn: radioText(true),
    radioTextOff: radioText(false),
    leaderSection: StyleSheet.flatten([
      styles.memberSection,
      { backgroundColor: colors.surface2, borderColor: "#6366f1" },
    ]),
    leaderTitle: StyleSheet.flatten([styles.sectionTitle, { color: "#818cf8" }]),
    sublabel: StyleSheet.flatten([styles.sublabel, { color: colors.foregroundMuted }]),
    sublabelSpaced: StyleSheet.flatten([
      styles.sublabel,
      { color: colors.foregroundMuted, marginTop: 8 },
    ]),
    leaderProviderChip: chip(
      styles.providerChip,
      styles.providerChipActive,
      styles.providerChipText,
      {
        ...leaderPalette,
        textOff: colors.foreground,
      },
    ),
    leaderModelChip: chip(styles.modelChip, styles.modelChipActive, styles.modelChipText, {
      ...leaderPalette,
      textOff: colors.foregroundMuted,
    }),
    memberCard: StyleSheet.flatten([
      styles.memberCard,
      { backgroundColor: colors.surface2, borderColor: colors.border },
    ]),
    inputSmall: StyleSheet.flatten([
      styles.inputSmall,
      {
        color: colors.foreground,
        borderColor: colors.border,
        backgroundColor: colors.surface1,
      },
    ]),
    teammateProviderChip: chip(
      styles.providerChipMini,
      styles.providerChipMiniActive,
      styles.providerChipTextMini,
      { ...teammatePalette, textOff: colors.foregroundMuted },
    ),
    teammateModelChip: chip(
      styles.modelChipMini,
      styles.modelChipMiniActive,
      styles.modelChipTextMini,
      { ...teammatePalette, textOff: colors.foregroundMuted },
    ),
    modalActions: StyleSheet.flatten([styles.modalActions, { borderTopColor: colors.border }]),
    cancelBtn: StyleSheet.flatten([styles.actionBtn, { borderColor: colors.border }]),
    cancelText: { color: colors.foreground },
  };
}

export function TeamCreateModal(props: TeamCreateModalProps) {
  if (!props.visible) return null;
  return <TeamCreateModalContent {...props} />;
}

// Hooks live here so they run on every render; the early return above would change their count.
function TeamCreateModalContent({ theme, onClose, onCreate }: TeamCreateModalProps) {
  const [teamName, setTeamName] = useState("");
  const [isolation, setIsolation] = useState<Isolation>("shared");
  const [leaderProvider, setLeaderProvider] = useState(DEFAULT_LEADER_PROVIDER);
  const [leaderModel, setLeaderModel] = useState("claude-3-7-sonnet");
  const [availableProviders, setAvailableProviders] = useState<ProviderOption[]>([]);

  const listProviders = useRpc(listProvidersRpc);
  const themed = useMemo(() => createModalStyles(theme), [theme]);

  useEffect(() => {
    let cancelled = false;
    async function loadProviders() {
      try {
        const res = await listProviders({});
        const [first] = res.providers;
        if (cancelled || !first) return;
        setAvailableProviders(res.providers);
        // The leader starts on the default provider; move it only when the host lacks that one.
        if (!res.providers.some((p) => p.id === DEFAULT_LEADER_PROVIDER)) {
          setLeaderProvider(first.id);
          setLeaderModel(first.models[0]?.id ?? "default");
        }
      } catch (err) {
        console.error("Failed to load providers:", err);
      }
    }
    loadProviders();
    return () => {
      cancelled = true;
    };
  }, [listProviders]);

  const [teammates, setTeammates] = useState<Teammate[]>(() => [
    newTeammate({ name: "Coder Agent", provider: "codex", model: "gpt-4o", colorIndex: 1 }),
    newTeammate({
      name: "Reviewer Agent",
      provider: "claude",
      model: "claude-3-7-sonnet",
      colorIndex: 2,
    }),
  ]);

  const providerList = useMemo(
    () => (availableProviders.length > 0 ? availableProviders : FALLBACK_PROVIDERS),
    [availableProviders],
  );

  const handleAddTeammate = useCallback(() => {
    setTeammates((prev) => {
      const defaultProvider = providerList[0]?.id ?? "claude";
      const defaultModel = providerList[0]?.models?.[0]?.id ?? "default";
      return [
        ...prev,
        newTeammate({
          name: `Teammate ${prev.length + 1}`,
          provider: defaultProvider,
          model: defaultModel,
          colorIndex: (prev.length + 1) % MEMBER_COLOR_PALETTE.length,
        }),
      ];
    });
  }, [providerList]);

  const handleUpdateTeammate = useCallback((key: string, patch: TeammatePatch) => {
    setTeammates((prev) => prev.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  }, []);

  const handleRemoveTeammate = useCallback((key: string) => {
    setTeammates((prev) => prev.filter((t) => t.key !== key));
  }, []);

  const handleSelectLeaderProvider = useCallback(
    (providerId: string) => {
      setLeaderProvider(providerId);
      const firstModel = providerList.find((p) => p.id === providerId)?.models[0];
      if (firstModel) setLeaderModel(firstModel.id);
    },
    [providerList],
  );

  const handleSubmit = useCallback(() => {
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
  }, [teamName, leaderProvider, leaderModel, teammates, isolation, onCreate, onClose]);

  const currentLeaderProviderObj = providerList.find((p) => p.id === leaderProvider);

  return (
    <View style={styles.backdrop}>
      <View style={themed.modalContainer}>
        <View style={themed.modalHeader}>
          <Text style={themed.title}>Create New Team</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={themed.closeIcon}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.scrollArea}>
          <View style={styles.formGroup}>
            <Text style={themed.label}>Team Name</Text>
            <TextInput
              style={themed.input}
              placeholder="e.g. Fullstack Feature Team"
              placeholderTextColor={theme.colors.foregroundMuted}
              value={teamName}
              onChangeText={setTeamName}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={themed.label}>Workspace Mode</Text>
            <View style={styles.radioRow}>
              <RadioOption
                value="shared"
                label="Shared Workspace"
                selected={isolation === "shared"}
                themed={themed}
                onSelect={setIsolation}
              />
              <RadioOption
                value="worktree"
                label="Git Worktree Isolation"
                selected={isolation === "worktree"}
                themed={themed}
                onSelect={setIsolation}
              />
            </View>
          </View>

          {/* Leader Configuration */}
          <View style={themed.leaderSection}>
            <View style={styles.sectionHeader}>
              <Text style={themed.leaderTitle}>👑 Leader (Orchestrator)</Text>
            </View>

            <Text style={themed.sublabel}>Select Provider:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.providerScroll}
            >
              {providerList.map((p) => (
                <Chip
                  key={p.id}
                  value={p.id}
                  label={p.name}
                  selected={leaderProvider === p.id}
                  chipStyles={themed.leaderProviderChip}
                  onSelect={handleSelectLeaderProvider}
                />
              ))}
            </ScrollView>

            <Text style={themed.sublabelSpaced}>Select Model:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.providerScroll}
            >
              {currentLeaderProviderObj?.models?.map((m) => (
                <Chip
                  key={m.id}
                  value={m.id}
                  label={m.label}
                  selected={leaderModel === m.id}
                  chipStyles={themed.leaderModelChip}
                  onSelect={setLeaderModel}
                />
              ))}
            </ScrollView>
          </View>

          {/* Teammates Configuration */}
          <View style={styles.formGroup}>
            <View style={styles.sectionHeader}>
              <Text style={themed.label}>Teammates ({teammates.length})</Text>
              <Pressable onPress={handleAddTeammate} style={styles.addBtn}>
                <Text style={styles.addBtnText}>+ Add Teammate</Text>
              </Pressable>
            </View>

            {teammates.map((tm) => (
              <TeammateCard
                key={tm.key}
                teammate={tm}
                providers={providerList}
                themed={themed}
                placeholderColor={theme.colors.foregroundMuted}
                onChange={handleUpdateTeammate}
                onRemove={handleRemoveTeammate}
              />
            ))}
          </View>
        </ScrollView>

        <View style={themed.modalActions}>
          <Pressable onPress={onClose} style={themed.cancelBtn}>
            <Text style={themed.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable onPress={handleSubmit} style={PRIMARY_ACTION_STYLE}>
            <Text style={styles.primaryBtnText}>Create Team</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

interface RadioOptionProps {
  value: Isolation;
  label: string;
  selected: boolean;
  themed: CreateModalStyles;
  onSelect: (value: Isolation) => void;
}

function RadioOption({ value, label, selected, themed, onSelect }: RadioOptionProps) {
  const handlePress = useCallback(() => onSelect(value), [onSelect, value]);
  return (
    <Pressable style={selected ? themed.radioOn : themed.radioOff} onPress={handlePress}>
      <Text style={selected ? themed.radioTextOn : themed.radioTextOff}>{label}</Text>
    </Pressable>
  );
}

interface ChipProps {
  value: string;
  label: string;
  selected: boolean;
  chipStyles: ChipStyles;
  onSelect: (value: string) => void;
}

function Chip({ value, label, selected, chipStyles, onSelect }: ChipProps) {
  const handlePress = useCallback(() => onSelect(value), [onSelect, value]);
  return (
    <Pressable onPress={handlePress} style={selected ? chipStyles.on : chipStyles.off}>
      <Text style={selected ? chipStyles.textOn : chipStyles.textOff}>{label}</Text>
    </Pressable>
  );
}

interface TeammateCardProps {
  teammate: Teammate;
  providers: ProviderOption[];
  themed: CreateModalStyles;
  placeholderColor: string;
  onChange: (key: string, patch: TeammatePatch) => void;
  onRemove: (key: string) => void;
}

function TeammateCard({
  teammate,
  providers,
  themed,
  placeholderColor,
  onChange,
  onRemove,
}: TeammateCardProps) {
  const { key } = teammate;
  const providerModels = providers.find((p) => p.id === teammate.provider)?.models;

  const handleName = useCallback((name: string) => onChange(key, { name }), [onChange, key]);
  const handleSelectProvider = useCallback(
    (providerId: string) => {
      const firstModel = providers.find((p) => p.id === providerId)?.models[0];
      onChange(
        key,
        firstModel ? { provider: providerId, model: firstModel.id } : { provider: providerId },
      );
    },
    [onChange, key, providers],
  );
  const handleSelectModel = useCallback(
    (model: string) => onChange(key, { model }),
    [onChange, key],
  );
  const handleRemove = useCallback(() => onRemove(key), [onRemove, key]);

  return (
    <View style={themed.memberCard}>
      <View style={styles.memberBody}>
        <TextInput
          style={themed.inputSmall}
          value={teammate.name}
          onChangeText={handleName}
          placeholder="Teammate Name"
          placeholderTextColor={placeholderColor}
        />

        {/* Provider selector for teammate */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {providers.map((p) => (
            <Chip
              key={p.id}
              value={p.id}
              label={p.name}
              selected={teammate.provider === p.id}
              chipStyles={themed.teammateProviderChip}
              onSelect={handleSelectProvider}
            />
          ))}
        </ScrollView>

        {/* Model selector for teammate */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {providerModels?.map((m) => (
            <Chip
              key={m.id}
              value={m.id}
              label={m.label}
              selected={teammate.model === m.id}
              chipStyles={themed.teammateModelChip}
              onSelect={handleSelectModel}
            />
          ))}
        </ScrollView>
      </View>

      <Pressable onPress={handleRemove} style={styles.removeBtn}>
        <Text style={styles.removeBtnText}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: FIXED_POSITION,
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
  memberBody: {
    flex: 1,
    gap: 6,
  },
});

const PRIMARY_ACTION_STYLE = StyleSheet.flatten([styles.actionBtn, styles.primaryBtn]);
