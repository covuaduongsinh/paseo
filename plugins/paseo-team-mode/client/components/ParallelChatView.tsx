import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image } from "react-native";
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import type { TeamConfig, TeamSlot, ChatMessage, ProviderOption, ChatAttachment } from "../../shared/contracts.js";
import { getSlotColor } from "../theme/member-colors.js";
import { SlashCommandMenu, type SlashCommand } from "./SlashCommandMenu.js";
import { ImageAttachmentBar } from "./ImageAttachmentBar.js";
import { ModelSelectorModal } from "./ModelSelectorModal.js";

interface ParallelChatViewProps {
  team: TeamConfig;
  messages: ChatMessage[];
  providers: ProviderOption[];
  theme: PluginSurfaceProps["theme"];
  activeSlotId?: string;
  onSelectSlot: (slotId: string) => void;
  onSendPrompt: (slotId: string, prompt: string, attachments?: ChatAttachment[]) => Promise<void>;
  onChangeProvider: (slotId: string, provider: string, model?: string) => Promise<void>;
}

export function ParallelChatView({
  team,
  messages,
  providers,
  theme,
  activeSlotId,
  onSelectSlot,
  onSendPrompt,
  onChangeProvider,
}: ParallelChatViewProps) {
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [stagedAttachments, setStagedAttachments] = useState<ChatAttachment[]>([]);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [selectedSlotForModel, setSelectedSlotForModel] = useState<TeamSlot | null>(null);

  const fileInputRef = useRef<any>(null);

  const targetSlotId = activeSlotId ?? team.slots[0]?.slotId ?? "";
  const targetSlot = team.slots.find((s) => s.slotId === targetSlotId);

  const handleInputChange = (text: string) => {
    setInputText(text);
    if (text.startsWith("/")) {
      setShowSlashMenu(true);
    } else {
      setShowSlashMenu(false);
    }
  };

  const handleSlashSelect = (cmd: SlashCommand) => {
    setInputText(cmd.template);
    setShowSlashMenu(false);
  };

  // Web clipboard paste listener for images
  const handlePaste = (e: any) => {
    const clipboardData = e.clipboardData || e.nativeEvent?.clipboardData || (window as any)?.clipboardData;
    if (!clipboardData) return;

    const items = clipboardData.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type && item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event: any) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
              setStagedAttachments((prev) => [
                ...prev,
                {
                  id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                  type: "image",
                  name: file.name || `Pasted Image ${prev.length + 1}`,
                  dataUrl,
                },
              ]);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  // File upload trigger
  const handleFileChange = (e: any) => {
    const files = e.target?.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event: any) => {
          const dataUrl = event.target?.result as string;
          if (dataUrl) {
            setStagedAttachments((prev) => [
              ...prev,
              {
                id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                type: "image",
                name: file.name,
                dataUrl,
              },
            ]);
          }
        };
        reader.readAsDataURL(file);
      }
    }
    // reset input
    if (e.target) e.target.value = "";
  };

  const handleSend = async () => {
    if ((!inputText.trim() && stagedAttachments.length === 0) || !targetSlotId || sending) return;
    const prompt = inputText.trim();
    const attachments = stagedAttachments.length > 0 ? [...stagedAttachments] : undefined;

    setInputText("");
    setStagedAttachments([]);
    setShowSlashMenu(false);
    setSending(true);

    try {
      await onSendPrompt(targetSlotId, prompt, attachments);
    } finally {
      setSending(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputText(prompt);
  };

  return (
    <View style={styles.outerContainer}>
      {/* Hidden file input for web attachment */}
      {typeof document !== "undefined" && (
        <input
          type="file"
          accept="image/*"
          multiple
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      )}

      {/* Model & Provider Selector Modal */}
      <ModelSelectorModal
        visible={selectedSlotForModel !== null}
        slot={selectedSlotForModel}
        providers={providers}
        theme={theme}
        onClose={() => setSelectedSlotForModel(null)}
        onSelect={async (pId, mId) => {
          if (selectedSlotForModel) {
            await onChangeProvider(selectedSlotForModel.slotId, pId, mId);
          }
        }}
      />

      <ScrollView horizontal style={styles.container} contentContainerStyle={styles.slotsWrapper}>
        {team.slots.map((slot) => {
          const color = getSlotColor(slot.colorIndex);
          const isActive = targetSlotId === slot.slotId;
          const slotMessages = messages.filter((m) => m.slotId === slot.slotId);

          return (
            <View
              key={slot.slotId}
              style={[
                styles.slotColumn,
                {
                  backgroundColor: theme.colors.surface2,
                  borderColor: isActive ? color.primary : theme.colors.border,
                  borderWidth: isActive ? 2 : 1,
                },
              ]}
            >
              {/* Slot Header */}
              <View
                style={[
                  styles.slotHeader,
                  {
                    backgroundColor: color.badgeBg,
                    borderBottomColor: theme.colors.border,
                  },
                ]}
              >
                <Pressable
                  onPress={() => onSelectSlot(slot.slotId)}
                  style={styles.headerTitleRow}
                >
                  <Text style={[styles.roleEmoji]}>
                    {slot.role === "leader" ? "👑" : "🤖"}
                  </Text>
                  <View>
                    <Text style={[styles.slotName, { color: color.text }]}>
                      {slot.name}
                    </Text>
                    {slot.model && (
                      <Text style={[styles.modelSubtitle, { color: color.text }]} numberOfLines={1}>
                        {slot.model}
                      </Text>
                    )}
                  </View>
                </Pressable>

                {/* Provider switcher button */}
                <View style={styles.metaRow}>
                  <Pressable
                    onPress={() => setSelectedSlotForModel(slot)}
                    style={[
                      styles.providerBadgeBtn,
                      {
                        backgroundColor: theme.colors.surface1,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.providerBadgeText, { color: theme.colors.foreground }]}>
                      ⚡ {slot.provider} {slot.model ? `(${slot.model})` : ""} ▾
                    </Text>
                  </Pressable>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          slot.status === "busy"
                            ? "#3b82f6"
                            : slot.status === "error"
                            ? "#ef4444"
                            : "#10b981",
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Slot Subheader Role / Instruction */}
              <View
                style={[
                  styles.subHeader,
                  { borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface1 },
                ]}
              >
                <Text style={[styles.roleTag, { color: theme.colors.foregroundMuted }]}>
                  {slot.role === "leader" ? "👑 ORCHESTRATOR" : "🤖 TEAMMATE SLOT"}
                </Text>
                <Text style={[styles.instructionText, { color: theme.colors.foreground }]} numberOfLines={2}>
                  {slot.instruction ||
                    (slot.role === "leader"
                      ? "Receives user goals, decomposes tasks, and delegates to teammates."
                      : "Ready to execute assigned tasks in parallel.")}
                </Text>
              </View>

              {/* Chat Timeline */}
              <ScrollView style={styles.chatTimeline} contentContainerStyle={styles.timelineContent}>
                {slotMessages.length === 0 ? (
                  <View style={styles.emptyTimeline}>
                    <Text style={[styles.emptyText, { color: theme.colors.foregroundMuted }]}>
                      No messages yet. Send a prompt below or paste an image to start coworking!
                    </Text>
                  </View>
                ) : (
                  slotMessages.map((msg) => {
                    const isUser = msg.sender === "user";
                    const isSystem = msg.sender === "system";

                    return (
                      <View
                        key={msg.id}
                        style={[
                          styles.messageBubble,
                          isUser
                            ? [styles.userBubble, { backgroundColor: "#6366f1" }]
                            : isSystem
                            ? [
                                styles.systemBubble,
                                {
                                  backgroundColor: theme.colors.surface1,
                                  borderColor: theme.colors.border,
                                },
                              ]
                            : [
                                styles.agentBubble,
                                {
                                  backgroundColor: theme.colors.surface1,
                                  borderLeftColor: color.primary,
                                  borderColor: theme.colors.border,
                                },
                              ],
                        ]}
                      >
                        <View style={styles.messageHeader}>
                          <Text
                            style={[
                              styles.messageSender,
                              { color: isUser ? "#fff" : isSystem ? theme.colors.foregroundMuted : color.text },
                            ]}
                          >
                            {isUser ? "You" : isSystem ? "System" : slot.name}
                          </Text>
                          <Text
                            style={[
                              styles.messageTime,
                              { color: isUser ? "rgba(255,255,255,0.7)" : theme.colors.foregroundMuted },
                            ]}
                          >
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </Text>
                        </View>

                        {/* Image Attachments in Message */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <View style={styles.msgAttachmentsGrid}>
                            {msg.attachments.map((att) => (
                              <View key={att.id} style={styles.msgImageWrapper}>
                                <Image
                                  source={{ uri: att.dataUrl }}
                                  style={styles.msgImage}
                                  resizeMode="contain"
                                />
                              </View>
                            ))}
                          </View>
                        )}

                        {msg.content ? (
                          <Text
                            style={[
                              styles.messageText,
                              { color: isUser ? "#fff" : theme.colors.foreground },
                            ]}
                          >
                            {msg.content}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })
                )}
              </ScrollView>

              {/* Slot Footer Focus indicator */}
              <Pressable
                onPress={() => onSelectSlot(slot.slotId)}
                style={[
                  styles.slotFooter,
                  {
                    borderTopColor: theme.colors.border,
                    backgroundColor: isActive ? color.badgeBg : theme.colors.surface1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.footerText,
                    { color: isActive ? color.text : theme.colors.foregroundMuted },
                  ]}
                >
                  {isActive ? `● Active Target (${slot.name})` : "Click to Focus"}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      {/* Modern Composer Bar with Slash Commands, Attachments, and Target Switcher */}
      <View
        style={[
          styles.composerContainer,
          {
            backgroundColor: theme.colors.surface1,
            borderTopColor: theme.colors.border,
          },
        ]}
      >
        {/* Floating Slash Command Menu */}
        {showSlashMenu && (
          <SlashCommandMenu
            query={inputText}
            theme={theme}
            onSelect={handleSlashSelect}
            onClose={() => setShowSlashMenu(false)}
          />
        )}

        {/* Target Agent Selector Chips & Quick Action Pills */}
        <View style={styles.targetBar}>
          <View style={styles.targetChips}>
            <Text style={[styles.targetLabel, { color: theme.colors.foregroundMuted }]}>
              Target:
            </Text>
            {team.slots.map((s) => {
              const isTarget = s.slotId === targetSlotId;
              const sColor = getSlotColor(s.colorIndex);
              return (
                <Pressable
                  key={s.slotId}
                  onPress={() => onSelectSlot(s.slotId)}
                  style={[
                    styles.targetChip,
                    {
                      borderColor: isTarget ? sColor.primary : theme.colors.border,
                      backgroundColor: isTarget ? sColor.badgeBg : theme.colors.surface2,
                    },
                  ]}
                >
                  <Text style={styles.targetChipEmoji}>
                    {s.role === "leader" ? "👑" : "🤖"}
                  </Text>
                  <Text
                    style={[
                      styles.targetChipText,
                      { color: isTarget ? sColor.text : theme.colors.foregroundMuted },
                    ]}
                  >
                    {s.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Quick Prompts */}
          <View style={styles.quickPromptsRow}>
            <Pressable
              onPress={() => handleQuickPrompt("/plan Phân tích yêu cầu và lập kế hoạch triển khai chi tiết cho team")}
              style={[styles.quickPromptPill, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface2 }]}
            >
              <Text style={[styles.quickPromptText, { color: theme.colors.foreground }]}>
                🏗️ /plan
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleQuickPrompt("/review Kiểm tra chất lượng mã nguồn và bảo mật")}
              style={[styles.quickPromptPill, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface2 }]}
            >
              <Text style={[styles.quickPromptText, { color: theme.colors.foreground }]}>
                🔍 /review
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleQuickPrompt("/test Viết unit test và kiểm tra regression")}
              style={[styles.quickPromptPill, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface2 }]}
            >
              <Text style={[styles.quickPromptText, { color: theme.colors.foreground }]}>
                ⚡ /test
              </Text>
            </Pressable>
            <Pressable
              onPress={() => handleQuickPrompt("/status")}
              style={[styles.quickPromptPill, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface2 }]}
            >
              <Text style={[styles.quickPromptText, { color: theme.colors.foreground }]}>
                📊 /status
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Staged Image Attachment Strip */}
        <ImageAttachmentBar
          attachments={stagedAttachments}
          theme={theme}
          onRemove={(id) => setStagedAttachments((prev) => prev.filter((a) => a.id !== id))}
        />

        {/* Input box and Action buttons */}
        <View style={styles.inputRow}>
          {/* Attachment Button */}
          <Pressable
            style={[
              styles.attachBtn,
              {
                backgroundColor: theme.colors.surface2,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => {
              if (fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
            accessibilityLabel="Attach Image"
          >
            <Text style={{ fontSize: 16 }}>📎</Text>
          </Pressable>

          <View
            style={[
              styles.inputWrapper,
              {
                borderColor: "#6366f1",
                backgroundColor: theme.colors.surface2,
              },
            ]}
            // @ts-ignore - web paste event
            onPaste={handlePaste}
          >
            <TextInput
              style={[
                styles.composerInput,
                {
                  color: theme.colors.foreground,
                },
              ]}
              multiline
              placeholder={`Send message or type / for commands, paste image (Ctrl+V) to @${targetSlot?.name || "Agent"}...`}
              placeholderTextColor={theme.colors.foregroundMuted}
              value={inputText}
              onChangeText={handleInputChange}
              onKeyPress={(e: any) => {
                if (e.nativeEvent?.key === "Enter" && !e.nativeEvent?.shiftKey) {
                  if (typeof e.preventDefault === "function") e.preventDefault();
                  handleSend();
                }
              }}
            />
          </View>

          <Pressable
            style={[
              styles.sendBtn,
              (!inputText.trim() && stagedAttachments.length === 0) || sending
                ? styles.sendBtnDisabled
                : styles.sendBtnActive,
            ]}
            onPress={handleSend}
            disabled={(!inputText.trim() && stagedAttachments.length === 0) || sending}
          >
            <Text style={styles.sendBtnText}>
              {sending ? "Sending..." : "Send 🚀"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  container: {
    flex: 1,
  },
  slotsWrapper: {
    padding: 12,
    gap: 12,
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: "100%",
  },
  slotColumn: {
    width: 360,
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  slotHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  roleEmoji: {
    fontSize: 16,
  },
  slotName: {
    fontSize: 14,
    fontWeight: "700",
  },
  modelSubtitle: {
    fontSize: 10,
    opacity: 0.8,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  providerBadgeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  providerBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  roleTag: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  instructionText: {
    fontSize: 11,
    lineHeight: 15,
  },
  chatTimeline: {
    flex: 1,
    padding: 10,
  },
  timelineContent: {
    gap: 10,
    paddingBottom: 10,
  },
  emptyTimeline: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  messageBubble: {
    padding: 10,
    borderRadius: 8,
    maxWidth: "92%",
  },
  userBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 2,
  },
  agentBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderLeftWidth: 3,
  },
  systemBubble: {
    alignSelf: "center",
    borderWidth: 1,
    width: "100%",
    borderRadius: 6,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  messageSender: {
    fontSize: 11,
    fontWeight: "700",
  },
  messageTime: {
    fontSize: 10,
  },
  messageText: {
    fontSize: 12,
    lineHeight: 17,
  },
  msgAttachmentsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  msgImageWrapper: {
    borderRadius: 6,
    overflow: "hidden",
    maxHeight: 180,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  msgImage: {
    width: 200,
    height: 140,
  },
  slotFooter: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    alignItems: "center",
  },
  footerText: {
    fontSize: 11,
    fontWeight: "600",
  },
  composerContainer: {
    padding: 10,
    borderTopWidth: 1,
    position: "relative",
  },
  targetBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 6,
  },
  targetChips: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  targetLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  targetChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  targetChipEmoji: {
    fontSize: 12,
  },
  targetChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  quickPromptsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quickPromptPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickPromptText: {
    fontSize: 11,
    fontWeight: "500",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 38,
    maxHeight: 120,
    justifyContent: "center",
  },
  composerInput: {
    fontSize: 13,
    padding: 0,
  },
  sendBtn: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnActive: {
    backgroundColor: "#6366f1",
  },
  sendBtnDisabled: {
    backgroundColor: "#a5b4fc",
  },
  sendBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
