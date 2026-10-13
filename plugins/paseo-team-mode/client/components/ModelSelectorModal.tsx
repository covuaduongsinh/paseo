import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput } from "react-native";
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import type { ProviderOption, TeamSlot } from "../../shared/contracts.js";

interface ModelSelectorModalProps {
  visible: boolean;
  slot: TeamSlot | null;
  providers: ProviderOption[];
  theme: PluginSurfaceProps["theme"];
  onClose: () => void;
  onSelect: (providerId: string, modelId: string) => void;
}

export function ModelSelectorModal({
  visible,
  slot,
  providers,
  theme,
  onClose,
  onSelect,
}: ModelSelectorModalProps) {
  if (!visible || !slot) return null;

  const currentProviderId = slot.provider || (providers[0]?.id ?? "claude");
  const [selectedProviderId, setSelectedProviderId] = useState(currentProviderId);
  const selectedProvider =
    providers.find((p) => p.id === selectedProviderId) ?? providers[0];

  const currentModelId =
    slot.model || selectedProvider?.models?.[0]?.id || "default";
  const [selectedModelId, setSelectedModelId] = useState(currentModelId);
  const [customModelId, setCustomModelId] = useState("");
  const [useCustomModel, setUseCustomModel] = useState(false);

  const handleApply = () => {
    const finalModel = useCustomModel && customModelId.trim()
      ? customModelId.trim()
      : selectedModelId;
    onSelect(selectedProviderId, finalModel);
    onClose();
  };

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
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <View>
            <Text style={[styles.title, { color: theme.colors.foreground }]}>
              Configure Slot Model
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.foregroundMuted }]}>
              Assign Agent runtime and AI model for {slot.name} ({slot.role})
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={[styles.closeIcon, { color: theme.colors.foregroundMuted }]}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.body}>
          {/* Step 1: Select Provider */}
          <Text style={[styles.sectionLabel, { color: theme.colors.foreground }]}>
            1. Select AI Provider / Engine
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.providersRow}
          >
            {providers.map((p) => {
              const isSelected = selectedProviderId === p.id;
              return (
                <Pressable
                  key={p.id}
                  style={[
                    styles.providerCard,
                    {
                      borderColor: isSelected ? "#6366f1" : theme.colors.border,
                      backgroundColor: isSelected
                        ? "rgba(99, 102, 241, 0.08)"
                        : theme.colors.surface2,
                    },
                  ]}
                  onPress={() => {
                    setSelectedProviderId(p.id);
                    if (p.models && p.models.length > 0) {
                      setSelectedModelId(p.models[0]!.id);
                    }
                    setUseCustomModel(false);
                  }}
                >
                  <Text style={styles.providerIcon}>
                    {p.id === "claude" ? "🧠" : p.id === "antigravity" ? "⚡" : p.id === "codex" ? "🤖" : p.id === "opencode" ? "🌐" : "🔧"}
                  </Text>
                  <Text
                    style={[
                      styles.providerName,
                      {
                        color: isSelected ? "#6366f1" : theme.colors.foreground,
                        fontWeight: isSelected ? "700" : "500",
                      },
                    ]}
                  >
                    {p.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Step 2: Select Model */}
          <Text style={[styles.sectionLabel, { color: theme.colors.foreground, marginTop: 16 }]}>
            2. Select Model for {selectedProvider?.name ?? selectedProviderId}
          </Text>
          <ScrollView style={styles.modelsList} contentContainerStyle={styles.modelsContainer}>
            {selectedProvider?.models && selectedProvider.models.length > 0 ? (
              selectedProvider.models.map((m) => {
                const isSelected = !useCustomModel && selectedModelId === m.id;
                return (
                  <Pressable
                    key={m.id}
                    style={[
                      styles.modelCard,
                      {
                        borderColor: isSelected ? "#6366f1" : theme.colors.border,
                        backgroundColor: isSelected
                          ? "rgba(99, 102, 241, 0.08)"
                          : theme.colors.surface2,
                      },
                    ]}
                    onPress={() => {
                      setSelectedModelId(m.id);
                      setUseCustomModel(false);
                    }}
                  >
                    <View style={styles.modelHeader}>
                      <Text
                        style={[
                          styles.modelLabel,
                          {
                            color: isSelected ? "#6366f1" : theme.colors.foreground,
                            fontWeight: isSelected ? "700" : "600",
                          },
                        ]}
                      >
                        {m.label}
                      </Text>
                      {m.isDefault && (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultText}>RECOMMENDED</Text>
                        </View>
                      )}
                    </View>
                    {m.description && (
                      <Text style={[styles.modelDesc, { color: theme.colors.foregroundMuted }]}>
                        {m.description}
                      </Text>
                    )}
                  </Pressable>
                );
              })
            ) : (
              <View style={styles.emptyModels}>
                <Text style={{ color: theme.colors.foregroundMuted }}>
                  Default model configuration will be used.
                </Text>
              </View>
            )}

            {/* Custom Model ID Option */}
            <Pressable
              style={[
                styles.modelCard,
                {
                  borderColor: useCustomModel ? "#6366f1" : theme.colors.border,
                  backgroundColor: useCustomModel
                    ? "rgba(99, 102, 241, 0.08)"
                    : theme.colors.surface2,
                  marginTop: 6,
                },
              ]}
              onPress={() => setUseCustomModel(true)}
            >
              <Text
                style={[
                  styles.modelLabel,
                  {
                    color: useCustomModel ? "#6366f1" : theme.colors.foreground,
                    fontWeight: useCustomModel ? "700" : "600",
                  },
                ]}
              >
                ⚙️ Custom Model Identifier
              </Text>
              {useCustomModel && (
                <TextInput
                  style={[
                    styles.customInput,
                    {
                      color: theme.colors.foreground,
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.surface1,
                    },
                  ]}
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
        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <Pressable
            style={[styles.cancelBtn, { borderColor: theme.colors.border }]}
            onPress={onClose}
          >
            <Text style={{ color: theme.colors.foregroundMuted, fontWeight: "600" }}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.applyBtn} onPress={handleApply}>
            <Text style={styles.applyBtnText}>Apply Model to {slot.name}</Text>
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
