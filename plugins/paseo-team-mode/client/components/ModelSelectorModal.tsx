import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import type { ProviderOption, TeamSlot } from "../../shared/contracts.js";
import { FIXED_POSITION } from "../theme/overlay.js";

const PROVIDER_ICONS: Record<string, string> = {
  claude: "🧠",
  antigravity: "⚡",
  codex: "🤖",
  opencode: "🌐",
};

interface ModelSelectorModalProps {
  visible: boolean;
  slot: TeamSlot | null;
  providers: ProviderOption[];
  theme: PluginSurfaceProps["theme"];
  onClose: () => void;
  onSelect: (providerId: string, modelId: string) => void;
}

export function ModelSelectorModal(props: ModelSelectorModalProps) {
  const { visible, slot } = props;
  if (!visible || !slot) return null;
  return <ModelSelectorModalContent {...props} slot={slot} />;
}

interface ModelSelectorModalContentProps extends ModelSelectorModalProps {
  slot: TeamSlot;
}

const ACCENT = "#6366f1";
const ACCENT_SOFT = "rgba(99, 102, 241, 0.08)";

interface ModalStyles {
  modalContainer: ViewStyle;
  header: ViewStyle;
  title: TextStyle;
  subtitle: TextStyle;
  closeIcon: TextStyle;
  sectionLabel: TextStyle;
  sectionLabelSpaced: TextStyle;
  providerCardOn: ViewStyle;
  providerCardOff: ViewStyle;
  providerNameOn: TextStyle;
  providerNameOff: TextStyle;
  modelCardOn: ViewStyle;
  modelCardOff: ViewStyle;
  modelLabelOn: TextStyle;
  modelLabelOff: TextStyle;
  modelDesc: TextStyle;
  emptyModelsText: TextStyle;
  customCardOn: ViewStyle;
  customCardOff: ViewStyle;
  customInput: TextStyle;
  footer: ViewStyle;
  cancelBtn: ViewStyle;
  cancelText: TextStyle;
}

function createModalStyles(theme: PluginSurfaceProps["theme"]): ModalStyles {
  const { colors } = theme;
  const card = (styleBase: ViewStyle, selected: boolean, extra?: ViewStyle): ViewStyle =>
    StyleSheet.flatten([
      styleBase,
      {
        borderColor: selected ? ACCENT : colors.border,
        backgroundColor: selected ? ACCENT_SOFT : colors.surface2,
      },
      extra,
    ]);
  const label = (styleBase: TextStyle, selected: boolean, weight: TextStyle["fontWeight"]) =>
    StyleSheet.flatten([
      styleBase,
      { color: selected ? ACCENT : colors.foreground, fontWeight: selected ? "700" : weight },
    ]);

  return {
    modalContainer: StyleSheet.flatten([
      styles.modalContainer,
      { backgroundColor: colors.surface1, borderColor: colors.border },
    ]),
    header: StyleSheet.flatten([styles.header, { borderBottomColor: colors.border }]),
    title: StyleSheet.flatten([styles.title, { color: colors.foreground }]),
    subtitle: StyleSheet.flatten([styles.subtitle, { color: colors.foregroundMuted }]),
    closeIcon: StyleSheet.flatten([styles.closeIcon, { color: colors.foregroundMuted }]),
    sectionLabel: StyleSheet.flatten([styles.sectionLabel, { color: colors.foreground }]),
    sectionLabelSpaced: StyleSheet.flatten([
      styles.sectionLabel,
      { color: colors.foreground, marginTop: 16 },
    ]),
    providerCardOn: card(styles.providerCard, true),
    providerCardOff: card(styles.providerCard, false),
    providerNameOn: label(styles.providerName, true, "500"),
    providerNameOff: label(styles.providerName, false, "500"),
    modelCardOn: card(styles.modelCard, true),
    modelCardOff: card(styles.modelCard, false),
    modelLabelOn: label(styles.modelLabel, true, "600"),
    modelLabelOff: label(styles.modelLabel, false, "600"),
    modelDesc: StyleSheet.flatten([styles.modelDesc, { color: colors.foregroundMuted }]),
    emptyModelsText: { color: colors.foregroundMuted },
    customCardOn: card(styles.modelCard, true, { marginTop: 6 }),
    customCardOff: card(styles.modelCard, false, { marginTop: 6 }),
    customInput: StyleSheet.flatten([
      styles.customInput,
      {
        color: colors.foreground,
        borderColor: colors.border,
        backgroundColor: colors.surface1,
      },
    ]),
    footer: StyleSheet.flatten([styles.footer, { borderTopColor: colors.border }]),
    cancelBtn: StyleSheet.flatten([styles.cancelBtn, { borderColor: colors.border }]),
    cancelText: { color: colors.foregroundMuted, fontWeight: "600" },
  };
}

// Hooks live here so they run on every render; the early return above would change their count.
function ModelSelectorModalContent({
  slot,
  providers,
  theme,
  onClose,
  onSelect,
}: ModelSelectorModalContentProps) {
  const currentProviderId = slot.provider || (providers[0]?.id ?? "claude");
  const [selectedProviderId, setSelectedProviderId] = useState(currentProviderId);
  const selectedProvider = providers.find((p) => p.id === selectedProviderId) ?? providers[0];

  const currentModelId = slot.model || selectedProvider?.models?.[0]?.id || "default";
  const [selectedModelId, setSelectedModelId] = useState(currentModelId);
  const [customModelId, setCustomModelId] = useState("");
  const [useCustomModel, setUseCustomModel] = useState(false);

  const themed = useMemo(() => createModalStyles(theme), [theme]);

  const handleSelectProvider = useCallback((provider: ProviderOption) => {
    setSelectedProviderId(provider.id);
    const firstModel = provider.models[0];
    if (firstModel) setSelectedModelId(firstModel.id);
    setUseCustomModel(false);
  }, []);

  const handleSelectModel = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
    setUseCustomModel(false);
  }, []);

  const handleUseCustomModel = useCallback(() => setUseCustomModel(true), []);

  const handleApply = useCallback(() => {
    const finalModel =
      useCustomModel && customModelId.trim() ? customModelId.trim() : selectedModelId;
    onSelect(selectedProviderId, finalModel);
    onClose();
  }, [useCustomModel, customModelId, selectedModelId, selectedProviderId, onSelect, onClose]);

  return (
    <View style={styles.backdrop}>
      <View style={themed.modalContainer}>
        {/* Header */}
        <View style={themed.header}>
          <View>
            <Text style={themed.title}>Configure Slot Model</Text>
            <Text style={themed.subtitle}>
              Assign Agent runtime and AI model for {slot.name} ({slot.role})
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={themed.closeIcon}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          {/* Step 1: Select Provider */}
          <Text style={themed.sectionLabel}>1. Select AI Provider / Engine</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.providersRow}
          >
            {providers.map((p) => (
              <ProviderCard
                key={p.id}
                provider={p}
                selected={selectedProviderId === p.id}
                themed={themed}
                onSelect={handleSelectProvider}
              />
            ))}
          </ScrollView>

          {/* Step 2: Select Model */}
          <Text style={themed.sectionLabelSpaced}>
            2. Select Model for {selectedProvider?.name ?? selectedProviderId}
          </Text>
          <ScrollView style={styles.modelsList} contentContainerStyle={styles.modelsContainer}>
            {selectedProvider?.models && selectedProvider.models.length > 0 ? (
              selectedProvider.models.map((m) => (
                <ModelCard
                  key={m.id}
                  model={m}
                  selected={!useCustomModel && selectedModelId === m.id}
                  themed={themed}
                  onSelect={handleSelectModel}
                />
              ))
            ) : (
              <View style={styles.emptyModels}>
                <Text style={themed.emptyModelsText}>
                  Default model configuration will be used.
                </Text>
              </View>
            )}

            {/* Custom Model ID Option */}
            <Pressable
              style={useCustomModel ? themed.customCardOn : themed.customCardOff}
              onPress={handleUseCustomModel}
            >
              <Text style={useCustomModel ? themed.modelLabelOn : themed.modelLabelOff}>
                ⚙️ Custom Model Identifier
              </Text>
              {useCustomModel && (
                <TextInput
                  style={themed.customInput}
                  placeholder="e.g. claude-3-7-sonnet-20250219 or deepseek-ai/DeepSeek-R1"
                  placeholderTextColor={theme.colors.foregroundMuted}
                  value={customModelId}
                  onChangeText={setCustomModelId}
                />
              )}
            </Pressable>
          </ScrollView>
        </View>

        {/* Footer */}
        <View style={themed.footer}>
          <Pressable style={themed.cancelBtn} onPress={onClose}>
            <Text style={themed.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.applyBtn} onPress={handleApply}>
            <Text style={styles.applyBtnText}>Apply Model to {slot.name}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

interface ProviderCardProps {
  provider: ProviderOption;
  selected: boolean;
  themed: ModalStyles;
  onSelect: (provider: ProviderOption) => void;
}

function ProviderCard({ provider, selected, themed, onSelect }: ProviderCardProps) {
  const handlePress = useCallback(() => onSelect(provider), [onSelect, provider]);
  return (
    <Pressable
      style={selected ? themed.providerCardOn : themed.providerCardOff}
      onPress={handlePress}
    >
      <Text style={styles.providerIcon}>{PROVIDER_ICONS[provider.id] ?? "🔧"}</Text>
      <Text style={selected ? themed.providerNameOn : themed.providerNameOff}>{provider.name}</Text>
    </Pressable>
  );
}

interface ModelCardProps {
  model: ProviderOption["models"][number];
  selected: boolean;
  themed: ModalStyles;
  onSelect: (modelId: string) => void;
}

function ModelCard({ model, selected, themed, onSelect }: ModelCardProps) {
  const handlePress = useCallback(() => onSelect(model.id), [onSelect, model.id]);
  return (
    <Pressable style={selected ? themed.modelCardOn : themed.modelCardOff} onPress={handlePress}>
      <View style={styles.modelHeader}>
        <Text style={selected ? themed.modelLabelOn : themed.modelLabelOff}>{model.label}</Text>
        {model.isDefault && <RecommendedBadge />}
      </View>
      {model.description && <Text style={themed.modelDesc}>{model.description}</Text>}
    </Pressable>
  );
}

function RecommendedBadge() {
  return (
    <View style={styles.defaultBadge}>
      <Text style={styles.defaultText}>RECOMMENDED</Text>
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
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  modalContainer: {
    width: "90%",
    maxWidth: 620,
    maxHeight: "85%",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  closeIcon: {
    fontSize: 16,
    fontWeight: "600",
  },
  body: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  providersRow: {
    gap: 8,
    flexDirection: "row",
    paddingBottom: 4,
  },
  providerCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  providerIcon: {
    fontSize: 16,
  },
  providerName: {
    fontSize: 13,
  },
  modelsList: {
    maxHeight: 220,
  },
  modelsContainer: {
    gap: 8,
    paddingBottom: 8,
  },
  modelCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  modelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modelLabel: {
    fontSize: 13,
  },
  defaultBadge: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#6366f1",
  },
  modelDesc: {
    fontSize: 11,
    marginTop: 4,
  },
  customInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    marginTop: 8,
  },
  emptyModels: {
    padding: 12,
    alignItems: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  applyBtn: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 6,
  },
  applyBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});
