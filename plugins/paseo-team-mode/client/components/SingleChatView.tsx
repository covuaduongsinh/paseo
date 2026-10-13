import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Image } from "react-native";
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import type { TeamConfig, TeamSlot, ChatMessage, ProviderOption, ChatAttachment } from "../../shared/contracts.js";
import { getSlotColor } from "../theme/member-colors.js";
import { SlashCommandMenu, type SlashCommand } from "./SlashCommandMenu.js";
import { ImageAttachmentBar } from "./ImageAttachmentBar.js";
import { ModelSelectorModal } from "./ModelSelectorModal.js";

interface SingleChatViewProps {
  team: TeamConfig;
  slot: TeamSlot;
  messages: ChatMessage[];
  providers: ProviderOption[];
  theme: PluginSurfaceProps["theme"];
  onSelectSlot: (slotId: string) => void;
  onSendPrompt: (slotId: string, prompt: string, attachments?: ChatAttachment[]) => Promise<void>;
  onChangeProvider: (slotId: string, provider: string, model?: string) => Promise<void>;
}

export function SingleChatView({
  team,
  slot,
  messages,
  providers,
  theme,
  onSelectSlot,
  onSendPrompt,
  onChangeProvider,
}: SingleChatViewProps) {
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [stagedAttachments, setStagedAttachments] = useState<ChatAttachment[]>([]);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);

  const fileInputRef = useRef<any>(null);

  const color = getSlotColor(slot.colorIndex);
  const slotMessages = messages.filter((m) => m.slotId === slot.slotId);

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
    if (e.target) e.target.value = "";
  };

  const handleSend = async () => {
    if ((!inputText.trim() && stagedAttachments.length === 0) || sending) return;
    const prompt = inputText.trim();
    const attachments = stagedAttachments.length > 0 ? [...stagedAttachments] : undefined;

    setInputText("");
    setStagedAttachments([]);
    setShowSlashMenu(false);
    setSending(true);

    try {
      await onSendPrompt(slot.slotId, prompt, attachments);
    } finally {
      setSending(false);
    }
  };

  const handleQuickPrompt = (text: string) => {
    setInputText(text);
  };

  return (
    <View style={styles.container}>
      {/* Hidden file input */}
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

      {/* Model Selector Modal */}
      <ModelSelectorModal
        visible={showModelModal}
        slot={slot}
        providers={providers}
        theme={theme}
        onClose={() => setShowModelModal(false)}
        onSelect={async (pId, mId) => {
          await onChangeProvider(slot.slotId, pId, mId);
        }}
      />

      {/* Header bar of focused agent */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: color.badgeBg,
            borderBottomColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.emoji}>{slot.role === "leader" ? "👑" : "🤖"}</Text>
          <View>
            <View style={styles.titleRow}>
              <Text style={[styles.agentName, { color: color.text }]}>{slot.name}</Text>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: color.primary + "20", borderColor: color.primary },
                ]}
              >
                <Text style={[styles.roleText, { color: color.primary }]}>
                  {slot.role === "leader" ? "LEADER" : "TEAMMATE"}
                </Text>
              </View>
            </View>
            <Text style={[styles.instruction, { color: theme.colors.foregroundMuted }]}>
              {slot.instruction ||
                (slot.role === "leader"
                  ? "Orchestrating team goals & delegating tasks"
                  : "Executing parallel tasks")}
            </Text>
          </View>
        </View>

        {/* Member tabs to switch focus quickly */}
        <View style={styles.slotSwitcherTabs}>
          {team.slots.map((s) => {
            const isCurrent = s.slotId === slot.slotId;
            const sCol = getSlotColor(s.colorIndex);
            return (
              <Pressable
                key={s.slotId}
                onPress={() => onSelectSlot(s.slotId)}
                style={[
                  styles.switcherTab,
                  {
                    borderColor: isCurrent ? sCol.primary : theme.colors.border,
                    backgroundColor: isCurrent ? sCol.badgeBg : theme.colors.surface1,
                  },
                ]}
              >
                <Text style={{ fontSize: 12 }}>{s.role === "leader" ? "👑" : "🤖"}</Text>
                <Text
                  style={[
                    styles.switcherTabText,
                    { color: isCurrent ? sCol.text : theme.colors.foregroundMuted },
                  ]}
                >
                  {s.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Provider / Model Button */}
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => setShowModelModal(true)}
            style={[
              styles.providerBtn,
              {
                backgroundColor: theme.colors.surface1,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.providerBtnText, { color: theme.colors.foreground }]}>
              ⚡ <Text style={{ fontWeight: "bold", color: color.text }}>{slot.provider}</Text>
              {slot.model ? ` (${slot.model})` : ""} ▾
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Messages Timeline */}
      <ScrollView
        style={[styles.chatList, { backgroundColor: theme.colors.surface2 }]}
        contentContainerStyle={styles.chatContent}
      >
        {slotMessages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={{ fontSize: 32 }}>💬</Text>
            <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>
              Start conversation with {slot.name}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.foregroundMuted }]}>
              Send a message, use slash commands (/plan, /review...), or paste images below.
            </Text>

            <View style={styles.promptCards}>
              <Pressable
                onPress={() =>
                  handleQuickPrompt(
                    slot.role === "leader"
                      ? "/plan Phân tích kiến trúc tổng thể và phân rã task cho các thành viên"
                      : "Hãy thực hiện task được giao và viết unit test chi tiết",
                  )
                }
                style={[
                  styles.promptCard,
                  {
                    backgroundColor: theme.colors.surface1,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.cardTitle, { color: theme.colors.foreground }]}>
                  {slot.role === "leader" ? "🏗️ /plan Phân rã kiến trúc" : "🚀 Bắt đầu thực thi"}
                </Text>
                <Text style={[styles.cardDesc, { color: theme.colors.foregroundMuted }]}>
                  {slot.role === "leader"
                    ? "Lập kế hoạch phân bổ công việc cho các slots"
                    : "Chạy các luồng mã nguồn được phân công"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          slotMessages.map((msg) => {
            const isUser = msg.sender === "user";
            const isSystem = msg.sender === "system";

            return (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  isUser ? styles.userRow : styles.agentRow,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
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
                            borderColor: theme.colors.border,
                            borderLeftColor: color.primary,
                          },
                        ],
                  ]}
                >
                  <View style={styles.meta}>
                    <Text
                      style={[
                        styles.senderName,
                        { color: isUser ? "#fff" : isSystem ? theme.colors.foregroundMuted : color.text },
                      ]}
                    >
                      {isUser ? "You" : isSystem ? "System" : slot.name}
                    </Text>
                    <Text
                      style={[
                        styles.time,
                        { color: isUser ? "rgba(255,255,255,0.7)" : theme.colors.foregroundMuted },
                      ]}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>

                  {/* Staged or attached images */}
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
                        styles.content,
                        { color: isUser ? "#fff" : theme.colors.foreground },
                      ]}
                    >
                      {msg.content}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Composer Input Footer */}
      <View
        style={[
          styles.composer,
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

        {/* Quick prompt pills */}
        <View style={styles.quickBar}>
          <Pressable
            onPress={() => handleQuickPrompt("/plan ")}
            style={[styles.pill, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface2 }]}
          >
            <Text style={[styles.pillText, { color: theme.colors.foreground }]}>🏗️ /plan</Text>
          </Pressable>
          <Pressable
            onPress={() => handleQuickPrompt("/review ")}
            style={[styles.pill, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface2 }]}
          >
            <Text style={[styles.pillText, { color: theme.colors.foreground }]}>🔍 /review</Text>
          </Pressable>
          <Pressable
            onPress={() => handleQuickPrompt("/test ")}
            style={[styles.pill, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface2 }]}
          >
            <Text style={[styles.pillText, { color: theme.colors.foreground }]}>⚡ /test</Text>
          </Pressable>
          <Pressable
            onPress={() => handleQuickPrompt("/status")}
            style={[styles.pill, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface2 }]}
          >
            <Text style={[styles.pillText, { color: theme.colors.foreground }]}>📊 /status</Text>
          </Pressable>
        </View>

        {/* Staged Image Attachment Bar */}
        <ImageAttachmentBar
          attachments={stagedAttachments}
          theme={theme}
          onRemove={(id) => setStagedAttachments((prev) => prev.filter((a) => a.id !== id))}
        />

        {/* Input & Send Action */}
        <View style={styles.inputRow}>
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
                styles.input,
                {
                  color: theme.colors.foreground,
                },
              ]}
              multiline
              placeholder={`Send message, type / for commands, paste image (Ctrl+V) to @${slot.name}...`}
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
  container: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emoji: {
    fontSize: 24,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  agentName: {
    fontSize: 16,
    fontWeight: "700",
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "700",
  },
  instruction: {
    fontSize: 12,
    marginTop: 2,
  },
  slotSwitcherTabs: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  switcherTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  switcherTabText: {
    fontSize: 11,
    fontWeight: "600",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  providerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  providerBtnText: {
    fontSize: 12,
  },
  chatList: {
    flex: 1,
  },
  chatContent: {
    padding: 20,
    gap: 14,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
    maxWidth: 420,
  },
  promptCards: {
    marginTop: 24,
    width: "100%",
    maxWidth: 440,
  },
  promptCard: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  cardDesc: {
    fontSize: 11,
    marginTop: 4,
  },
  messageRow: {
    width: "100%",
    flexDirection: "row",
  },
  userRow: {
    justifyContent: "flex-end",
  },
  agentRow: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    padding: 14,
    borderRadius: 10,
  },
  userBubble: {
    borderBottomRightRadius: 2,
  },
  agentBubble: {
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  systemBubble: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 6,
  },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 12,
  },
  senderName: {
    fontSize: 11,
    fontWeight: "700",
  },
  time: {
    fontSize: 10,
  },
  content: {
    fontSize: 13,
    lineHeight: 20,
  },
  msgAttachmentsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  msgImageWrapper: {
    borderRadius: 8,
    overflow: "hidden",
    maxHeight: 240,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  msgImage: {
    width: 280,
    height: 180,
  },
  composer: {
    padding: 14,
    borderTopWidth: 1,
    position: "relative",
  },
  quickBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "500",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  attachBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 42,
    maxHeight: 140,
    justifyContent: "center",
  },
  input: {
    fontSize: 13,
    padding: 0,
  },
  sendBtn: {
    paddingHorizontal: 18,
    height: 42,
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
    fontSize: 13,
    fontWeight: "700",
  },
});
