import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import type {
  TeamConfig,
  TeamSlot,
  ChatMessage,
  ProviderOption,
  ChatAttachment,
} from "../../shared/contracts.js";
import { getSlotColor } from "../theme/member-colors.js";
import { ChatComposer, type QuickPrompt } from "./ChatComposer.js";
import { ModelSelectorModal } from "./ModelSelectorModal.js";

type Theme = PluginSurfaceProps["theme"];
type SlotColor = ReturnType<typeof getSlotColor>;

const QUICK_PROMPTS: readonly QuickPrompt[] = [
  { label: "🏗️ /plan", prompt: "/plan " },
  { label: "🔍 /review", prompt: "/review " },
  { label: "⚡ /test", prompt: "/test " },
  { label: "📊 /status", prompt: "/status" },
];

interface SingleChatViewProps {
  team: TeamConfig;
  slot: TeamSlot;
  messages: ChatMessage[];
  providers: ProviderOption[];
  theme: Theme;
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
  const [showModelModal, setShowModelModal] = useState(false);

  const color = getSlotColor(slot.colorIndex);
  const slotMessages = useMemo(
    () => messages.filter((m) => m.slotId === slot.slotId),
    [messages, slot.slotId],
  );
  const themed = useMemo(() => createSingleStyles(theme, color), [theme, color]);

  const handleOpenModel = useCallback(() => setShowModelModal(true), []);
  const handleCloseModel = useCallback(() => setShowModelModal(false), []);
  const handleSelectModel = useCallback(
    async (providerId: string, modelId: string) => {
      await onChangeProvider(slot.slotId, providerId, modelId);
    },
    [onChangeProvider, slot.slotId],
  );

  const isLeader = slot.role === "leader";
  const placeholder = `Send message, type / for commands, paste image (Ctrl+V) to @${slot.name}...`;

  return (
    <View style={styles.container}>
      {/* Model Selector Modal */}
      <ModelSelectorModal
        visible={showModelModal}
        slot={slot}
        providers={providers}
        theme={theme}
        onClose={handleCloseModel}
        onSelect={handleSelectModel}
      />

      {/* Header bar of focused agent */}
      <View style={themed.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.emoji}>{isLeader ? "👑" : "🤖"}</Text>
          <View>
            <View style={styles.titleRow}>
              <Text style={themed.agentName}>{slot.name}</Text>
              <View style={themed.roleBadge}>
                <Text style={themed.roleText}>{isLeader ? "LEADER" : "TEAMMATE"}</Text>
              </View>
            </View>
            <Text style={themed.instruction}>
              {slot.instruction ||
                (isLeader
                  ? "Orchestrating team goals & delegating tasks"
                  : "Executing parallel tasks")}
            </Text>
          </View>
        </View>

        {/* Member tabs to switch focus quickly */}
        <View style={styles.slotSwitcherTabs}>
          {team.slots.map((s) => (
            <SwitcherTab
              key={s.slotId}
              slot={s}
              current={s.slotId === slot.slotId}
              theme={theme}
              onSelect={onSelectSlot}
            />
          ))}
        </View>

        {/* Provider / Model Button */}
        <View style={styles.headerRight}>
          <Pressable onPress={handleOpenModel} style={themed.providerBtn}>
            <Text style={themed.providerBtnText}>
              ⚡ <Text style={themed.providerName}>{slot.provider}</Text>
              {slot.model ? ` (${slot.model})` : ""} ▾
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Messages Timeline */}
      <ScrollView style={themed.chatList} contentContainerStyle={styles.chatContent}>
        {slotMessages.length === 0 ? (
          <EmptyConversation slot={slot} themed={themed} onQuickPrompt={setInputText} />
        ) : (
          slotMessages.map((msg) => (
            <MessageRow key={msg.id} message={msg} slotName={slot.name} themed={themed} />
          ))
        )}
      </ScrollView>

      <ChatComposer
        theme={theme}
        density="regular"
        targetSlotId={slot.slotId}
        placeholder={placeholder}
        quickPrompts={QUICK_PROMPTS}
        value={inputText}
        onChangeText={setInputText}
        onSendPrompt={onSendPrompt}
      />
    </View>
  );
}

interface SingleStyles {
  header: ViewStyle;
  agentName: TextStyle;
  roleBadge: ViewStyle;
  roleText: TextStyle;
  instruction: TextStyle;
  providerBtn: ViewStyle;
  providerBtnText: TextStyle;
  providerName: TextStyle;
  chatList: ViewStyle;
  emptyTitle: TextStyle;
  emptySubtitle: TextStyle;
  promptCard: ViewStyle;
  cardTitle: TextStyle;
  cardDesc: TextStyle;
  bubbleUser: ViewStyle;
  bubbleSystem: ViewStyle;
  bubbleAgent: ViewStyle;
  senderUser: TextStyle;
  senderSystem: TextStyle;
  senderAgent: TextStyle;
  timeUser: TextStyle;
  timeOther: TextStyle;
  contentUser: TextStyle;
  contentOther: TextStyle;
}

function createSingleStyles(theme: Theme, color: SlotColor): SingleStyles {
  const { colors } = theme;
  const sender = (textColor: string): TextStyle =>
    StyleSheet.flatten([styles.senderName, { color: textColor }]);

  return {
    header: StyleSheet.flatten([
      styles.header,
      { backgroundColor: color.badgeBg, borderBottomColor: colors.border },
    ]),
    agentName: StyleSheet.flatten([styles.agentName, { color: color.text }]),
    roleBadge: StyleSheet.flatten([
      styles.roleBadge,
      { backgroundColor: color.primary + "20", borderColor: color.primary },
    ]),
    roleText: StyleSheet.flatten([styles.roleText, { color: color.primary }]),
    instruction: StyleSheet.flatten([styles.instruction, { color: colors.foregroundMuted }]),
    providerBtn: StyleSheet.flatten([
      styles.providerBtn,
      { backgroundColor: colors.surface1, borderColor: colors.border },
    ]),
    providerBtnText: StyleSheet.flatten([styles.providerBtnText, { color: colors.foreground }]),
    providerName: { fontWeight: "bold", color: color.text },
    chatList: StyleSheet.flatten([styles.chatList, { backgroundColor: colors.surface2 }]),
    emptyTitle: StyleSheet.flatten([styles.emptyTitle, { color: colors.foreground }]),
    emptySubtitle: StyleSheet.flatten([styles.emptySubtitle, { color: colors.foregroundMuted }]),
    promptCard: StyleSheet.flatten([
      styles.promptCard,
      { backgroundColor: colors.surface1, borderColor: colors.border },
    ]),
    cardTitle: StyleSheet.flatten([styles.cardTitle, { color: colors.foreground }]),
    cardDesc: StyleSheet.flatten([styles.cardDesc, { color: colors.foregroundMuted }]),
    bubbleUser: StyleSheet.flatten([
      styles.bubble,
      styles.userBubble,
      { backgroundColor: "#6366f1" },
    ]),
    bubbleSystem: StyleSheet.flatten([
      styles.bubble,
      styles.systemBubble,
      { backgroundColor: colors.surface1, borderColor: colors.border },
    ]),
    bubbleAgent: StyleSheet.flatten([
      styles.bubble,
      styles.agentBubble,
      {
        backgroundColor: colors.surface1,
        borderColor: colors.border,
        borderLeftColor: color.primary,
      },
    ]),
    senderUser: sender("#fff"),
    senderSystem: sender(colors.foregroundMuted),
    senderAgent: sender(color.text),
    timeUser: StyleSheet.flatten([styles.time, { color: "rgba(255,255,255,0.7)" }]),
    timeOther: StyleSheet.flatten([styles.time, { color: colors.foregroundMuted }]),
    contentUser: StyleSheet.flatten([styles.content, { color: "#fff" }]),
    contentOther: StyleSheet.flatten([styles.content, { color: colors.foreground }]),
  };
}

interface SwitcherTabProps {
  slot: TeamSlot;
  current: boolean;
  theme: Theme;
  onSelect: (slotId: string) => void;
}

function SwitcherTab({ slot, current, theme, onSelect }: SwitcherTabProps) {
  const slotColor = getSlotColor(slot.colorIndex);
  const { border, surface1, foregroundMuted } = theme.colors;
  const tabStyle = useMemo(
    () =>
      StyleSheet.flatten([
        styles.switcherTab,
        {
          borderColor: current ? slotColor.primary : border,
          backgroundColor: current ? slotColor.badgeBg : surface1,
        },
      ]),
    [current, slotColor.primary, slotColor.badgeBg, border, surface1],
  );
  const textStyle = useMemo(
    () =>
      StyleSheet.flatten([
        styles.switcherTabText,
        { color: current ? slotColor.text : foregroundMuted },
      ]),
    [current, slotColor.text, foregroundMuted],
  );
  const handlePress = useCallback(() => onSelect(slot.slotId), [onSelect, slot.slotId]);

  return (
    <Pressable onPress={handlePress} style={tabStyle}>
      <Text style={styles.switcherTabEmoji}>{slot.role === "leader" ? "👑" : "🤖"}</Text>
      <Text style={textStyle}>{slot.name}</Text>
    </Pressable>
  );
}

interface EmptyConversationProps {
  slot: TeamSlot;
  themed: SingleStyles;
  onQuickPrompt: (prompt: string) => void;
}

function EmptyConversation({ slot, themed, onQuickPrompt }: EmptyConversationProps) {
  const isLeader = slot.role === "leader";
  const prompt = isLeader
    ? "/plan Phân tích kiến trúc tổng thể và phân rã task cho các thành viên"
    : "Hãy thực hiện task được giao và viết unit test chi tiết";
  const handlePress = useCallback(() => onQuickPrompt(prompt), [onQuickPrompt, prompt]);

  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>💬</Text>
      <Text style={themed.emptyTitle}>Start conversation with {slot.name}</Text>
      <Text style={themed.emptySubtitle}>
        Send a message, use slash commands (/plan, /review...), or paste images below.
      </Text>

      <View style={styles.promptCards}>
        <Pressable onPress={handlePress} style={themed.promptCard}>
          <Text style={themed.cardTitle}>
            {isLeader ? "🏗️ /plan Phân rã kiến trúc" : "🚀 Bắt đầu thực thi"}
          </Text>
          <Text style={themed.cardDesc}>
            {isLeader
              ? "Lập kế hoạch phân bổ công việc cho các slots"
              : "Chạy các luồng mã nguồn được phân công"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

interface MessageRowProps {
  message: ChatMessage;
  slotName: string;
  themed: SingleStyles;
}

function MessageRow({ message, slotName, themed }: MessageRowProps) {
  const isUser = message.sender === "user";
  const isSystem = message.sender === "system";

  let bubbleStyle = themed.bubbleAgent;
  let senderStyle = themed.senderAgent;
  let senderLabel = slotName;
  if (isUser) {
    bubbleStyle = themed.bubbleUser;
    senderStyle = themed.senderUser;
    senderLabel = "You";
  } else if (isSystem) {
    bubbleStyle = themed.bubbleSystem;
    senderStyle = themed.senderSystem;
    senderLabel = "System";
  }

  return (
    <View style={isUser ? USER_ROW_STYLE : AGENT_ROW_STYLE}>
      <View style={bubbleStyle}>
        <View style={styles.meta}>
          <Text style={senderStyle}>{senderLabel}</Text>
          <Text style={isUser ? themed.timeUser : themed.timeOther}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </Text>
        </View>

        {/* Staged or attached images */}
        {message.attachments && message.attachments.length > 0 && (
          <MessageAttachments attachments={message.attachments} />
        )}

        {message.content ? (
          <Text style={isUser ? themed.contentUser : themed.contentOther}>{message.content}</Text>
        ) : null}
      </View>
    </View>
  );
}

function MessageAttachments({ attachments }: { attachments: ChatAttachment[] }) {
  return (
    <View style={styles.msgAttachmentsGrid}>
      {attachments.map((att) => (
        <AttachmentImage key={att.id} dataUrl={att.dataUrl} />
      ))}
    </View>
  );
}

function AttachmentImage({ dataUrl }: { dataUrl: string | undefined }) {
  const source = useMemo(() => ({ uri: dataUrl }), [dataUrl]);
  return (
    <View style={styles.msgImageWrapper}>
      <Image source={source} style={styles.msgImage} resizeMode="contain" />
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
  emptyEmoji: {
    fontSize: 32,
  },
  switcherTabEmoji: {
    fontSize: 12,
  },
});

const USER_ROW_STYLE = StyleSheet.flatten([styles.messageRow, styles.userRow]);
const AGENT_ROW_STYLE = StyleSheet.flatten([styles.messageRow, styles.agentRow]);
