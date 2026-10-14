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

const STATUS_COLORS: Record<string, string> = { busy: "#3b82f6", error: "#ef4444" };
const NO_MESSAGES: ChatMessage[] = [];

const QUICK_PROMPTS: readonly QuickPrompt[] = [
  {
    label: "🏗️ /plan",
    prompt: "/plan Phân tích yêu cầu và lập kế hoạch triển khai chi tiết cho team",
  },
  { label: "🔍 /review", prompt: "/review Kiểm tra chất lượng mã nguồn và bảo mật" },
  { label: "⚡ /test", prompt: "/test Viết unit test và kiểm tra regression" },
  { label: "📊 /status", prompt: "/status" },
];

interface ParallelChatViewProps {
  team: TeamConfig;
  messages: ChatMessage[];
  providers: ProviderOption[];
  theme: Theme;
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
  const [selectedSlotForModel, setSelectedSlotForModel] = useState<TeamSlot | null>(null);

  const targetSlotId = activeSlotId ?? team.slots[0]?.slotId ?? "";
  const targetSlot = team.slots.find((s) => s.slotId === targetSlotId);

  const messagesBySlot = useMemo(() => {
    const groups = new Map<string, ChatMessage[]>();
    for (const message of messages) {
      const group = groups.get(message.slotId);
      if (group) group.push(message);
      else groups.set(message.slotId, [message]);
    }
    return groups;
  }, [messages]);

  const handleCloseModel = useCallback(() => setSelectedSlotForModel(null), []);
  const handleSelectModel = useCallback(
    async (providerId: string, modelId: string) => {
      if (selectedSlotForModel) {
        await onChangeProvider(selectedSlotForModel.slotId, providerId, modelId);
      }
    },
    [onChangeProvider, selectedSlotForModel],
  );

  const placeholder = `Send message or type / for commands, paste image (Ctrl+V) to @${targetSlot?.name || "Agent"}...`;

  return (
    <View style={styles.outerContainer}>
      {/* Model & Provider Selector Modal */}
      <ModelSelectorModal
        visible={selectedSlotForModel !== null}
        slot={selectedSlotForModel}
        providers={providers}
        theme={theme}
        onClose={handleCloseModel}
        onSelect={handleSelectModel}
      />

      <ScrollView horizontal style={styles.container} contentContainerStyle={styles.slotsWrapper}>
        {team.slots.map((slot) => (
          <SlotColumn
            key={slot.slotId}
            slot={slot}
            active={targetSlotId === slot.slotId}
            messages={messagesBySlot.get(slot.slotId) ?? NO_MESSAGES}
            theme={theme}
            onSelectSlot={onSelectSlot}
            onOpenModel={setSelectedSlotForModel}
          />
        ))}
      </ScrollView>

      {/* Composer with Slash Commands, Attachments, and Target Switcher */}
      <ChatComposer
        theme={theme}
        density="compact"
        targetSlotId={targetSlotId}
        placeholder={placeholder}
        quickPrompts={QUICK_PROMPTS}
        value={inputText}
        onChangeText={setInputText}
        onSendPrompt={onSendPrompt}
      >
        <TargetChips
          slots={team.slots}
          targetSlotId={targetSlotId}
          theme={theme}
          onSelect={onSelectSlot}
        />
      </ChatComposer>
    </View>
  );
}

interface TargetChipsProps {
  slots: TeamSlot[];
  targetSlotId: string;
  theme: Theme;
  onSelect: (slotId: string) => void;
}

function TargetChips({ slots, targetSlotId, theme, onSelect }: TargetChipsProps) {
  const labelStyle = useMemo(
    () => StyleSheet.flatten([styles.targetLabel, { color: theme.colors.foregroundMuted }]),
    [theme.colors.foregroundMuted],
  );

  return (
    <View style={styles.targetChips}>
      <Text style={labelStyle}>Target:</Text>
      {slots.map((s) => (
        <TargetChip
          key={s.slotId}
          slot={s}
          selected={s.slotId === targetSlotId}
          theme={theme}
          onSelect={onSelect}
        />
      ))}
    </View>
  );
}

interface TargetChipProps {
  slot: TeamSlot;
  selected: boolean;
  theme: Theme;
  onSelect: (slotId: string) => void;
}

function TargetChip({ slot, selected, theme, onSelect }: TargetChipProps) {
  const slotColor = getSlotColor(slot.colorIndex);
  const { border, surface2, foregroundMuted } = theme.colors;
  const chipStyle = useMemo(
    () =>
      StyleSheet.flatten([
        styles.targetChip,
        {
          borderColor: selected ? slotColor.primary : border,
          backgroundColor: selected ? slotColor.badgeBg : surface2,
        },
      ]),
    [selected, slotColor.primary, slotColor.badgeBg, border, surface2],
  );
  const textStyle = useMemo(
    () =>
      StyleSheet.flatten([
        styles.targetChipText,
        { color: selected ? slotColor.text : foregroundMuted },
      ]),
    [selected, slotColor.text, foregroundMuted],
  );
  const handlePress = useCallback(() => onSelect(slot.slotId), [onSelect, slot.slotId]);

  return (
    <Pressable onPress={handlePress} style={chipStyle}>
      <Text style={styles.targetChipEmoji}>{slot.role === "leader" ? "👑" : "🤖"}</Text>
      <Text style={textStyle}>{slot.name}</Text>
    </Pressable>
  );
}

interface ColumnStyles {
  column: ViewStyle;
  header: ViewStyle;
  slotName: TextStyle;
  modelSubtitle: TextStyle;
  providerBadgeBtn: ViewStyle;
  providerBadgeText: TextStyle;
  statusBadge: ViewStyle;
  subHeader: ViewStyle;
  roleTag: TextStyle;
  instructionText: TextStyle;
  emptyText: TextStyle;
  bubbleUser: ViewStyle;
  bubbleSystem: ViewStyle;
  bubbleAgent: ViewStyle;
  senderUser: TextStyle;
  senderSystem: TextStyle;
  senderAgent: TextStyle;
  timeUser: TextStyle;
  timeOther: TextStyle;
  textUser: TextStyle;
  textOther: TextStyle;
  footer: ViewStyle;
  footerText: TextStyle;
}

function createColumnStyles(theme: Theme, color: SlotColor, active: boolean, status: string) {
  const { colors } = theme;
  const sender = (textColor: string): TextStyle =>
    StyleSheet.flatten([styles.messageSender, { color: textColor }]);

  const result: ColumnStyles = {
    column: StyleSheet.flatten([
      styles.slotColumn,
      {
        backgroundColor: colors.surface2,
        borderColor: active ? color.primary : colors.border,
        borderWidth: active ? 2 : 1,
      },
    ]),
    header: StyleSheet.flatten([
      styles.slotHeader,
      { backgroundColor: color.badgeBg, borderBottomColor: colors.border },
    ]),
    slotName: StyleSheet.flatten([styles.slotName, { color: color.text }]),
    modelSubtitle: StyleSheet.flatten([styles.modelSubtitle, { color: color.text }]),
    providerBadgeBtn: StyleSheet.flatten([
      styles.providerBadgeBtn,
      { backgroundColor: colors.surface1, borderColor: colors.border },
    ]),
    providerBadgeText: StyleSheet.flatten([styles.providerBadgeText, { color: colors.foreground }]),
    statusBadge: StyleSheet.flatten([
      styles.statusBadge,
      { backgroundColor: STATUS_COLORS[status] ?? "#10b981" },
    ]),
    subHeader: StyleSheet.flatten([
      styles.subHeader,
      { borderBottomColor: colors.border, backgroundColor: colors.surface1 },
    ]),
    roleTag: StyleSheet.flatten([styles.roleTag, { color: colors.foregroundMuted }]),
    instructionText: StyleSheet.flatten([styles.instructionText, { color: colors.foreground }]),
    emptyText: StyleSheet.flatten([styles.emptyText, { color: colors.foregroundMuted }]),
    bubbleUser: StyleSheet.flatten([
      styles.messageBubble,
      styles.userBubble,
      { backgroundColor: "#6366f1" },
    ]),
    bubbleSystem: StyleSheet.flatten([
      styles.messageBubble,
      styles.systemBubble,
      { backgroundColor: colors.surface1, borderColor: colors.border },
    ]),
    bubbleAgent: StyleSheet.flatten([
      styles.messageBubble,
      styles.agentBubble,
      {
        backgroundColor: colors.surface1,
        borderLeftColor: color.primary,
        borderColor: colors.border,
      },
    ]),
    senderUser: sender("#fff"),
    senderSystem: sender(colors.foregroundMuted),
    senderAgent: sender(color.text),
    timeUser: StyleSheet.flatten([styles.messageTime, { color: "rgba(255,255,255,0.7)" }]),
    timeOther: StyleSheet.flatten([styles.messageTime, { color: colors.foregroundMuted }]),
    textUser: StyleSheet.flatten([styles.messageText, { color: "#fff" }]),
    textOther: StyleSheet.flatten([styles.messageText, { color: colors.foreground }]),
    footer: StyleSheet.flatten([
      styles.slotFooter,
      {
        borderTopColor: colors.border,
        backgroundColor: active ? color.badgeBg : colors.surface1,
      },
    ]),
    footerText: StyleSheet.flatten([
      styles.footerText,
      { color: active ? color.text : colors.foregroundMuted },
    ]),
  };
  return result;
}

interface SlotColumnProps {
  slot: TeamSlot;
  active: boolean;
  messages: ChatMessage[];
  theme: Theme;
  onSelectSlot: (slotId: string) => void;
  onOpenModel: (slot: TeamSlot) => void;
}

function SlotColumn({ slot, active, messages, theme, onSelectSlot, onOpenModel }: SlotColumnProps) {
  const color = getSlotColor(slot.colorIndex);
  const themed = useMemo(
    () => createColumnStyles(theme, color, active, slot.status),
    [theme, color, active, slot.status],
  );
  const handleSelect = useCallback(() => onSelectSlot(slot.slotId), [onSelectSlot, slot.slotId]);
  const handleOpenModel = useCallback(() => onOpenModel(slot), [onOpenModel, slot]);

  const isLeader = slot.role === "leader";

  return (
    <View style={themed.column}>
      {/* Slot Header */}
      <View style={themed.header}>
        <Pressable onPress={handleSelect} style={styles.headerTitleRow}>
          <Text style={styles.roleEmoji}>{isLeader ? "👑" : "🤖"}</Text>
          <View>
            <Text style={themed.slotName}>{slot.name}</Text>
            {slot.model && (
              <Text style={themed.modelSubtitle} numberOfLines={1}>
                {slot.model}
              </Text>
            )}
          </View>
        </Pressable>

        {/* Provider switcher button */}
        <View style={styles.metaRow}>
          <Pressable onPress={handleOpenModel} style={themed.providerBadgeBtn}>
            <Text style={themed.providerBadgeText}>
              ⚡ {slot.provider} {slot.model ? `(${slot.model})` : ""} ▾
            </Text>
          </Pressable>

          <View style={themed.statusBadge} />
        </View>
      </View>

      {/* Slot Subheader Role / Instruction */}
      <View style={themed.subHeader}>
        <Text style={themed.roleTag}>{isLeader ? "👑 ORCHESTRATOR" : "🤖 TEAMMATE SLOT"}</Text>
        <Text style={themed.instructionText} numberOfLines={2}>
          {slot.instruction ||
            (isLeader
              ? "Receives user goals, decomposes tasks, and delegates to teammates."
              : "Ready to execute assigned tasks in parallel.")}
        </Text>
      </View>

      {/* Chat Timeline */}
      <ScrollView style={styles.chatTimeline} contentContainerStyle={styles.timelineContent}>
        {messages.length === 0 ? (
          <View style={styles.emptyTimeline}>
            <Text style={themed.emptyText}>
              No messages yet. Send a prompt below or paste an image to start coworking!
            </Text>
          </View>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} slotName={slot.name} themed={themed} />
          ))
        )}
      </ScrollView>

      {/* Slot Footer Focus indicator */}
      <Pressable onPress={handleSelect} style={themed.footer}>
        <Text style={themed.footerText}>
          {active ? `● Active Target (${slot.name})` : "Click to Focus"}
        </Text>
      </Pressable>
    </View>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
  slotName: string;
  themed: ColumnStyles;
}

function MessageBubble({ message, slotName, themed }: MessageBubbleProps) {
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
    <View style={bubbleStyle}>
      <View style={styles.messageHeader}>
        <Text style={senderStyle}>{senderLabel}</Text>
        <Text style={isUser ? themed.timeUser : themed.timeOther}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>

      {/* Image Attachments in Message */}
      {message.attachments && message.attachments.length > 0 && (
        <MessageAttachments attachments={message.attachments} />
      )}

      {message.content ? (
        <Text style={isUser ? themed.textUser : themed.textOther}>{message.content}</Text>
      ) : null}
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
});
