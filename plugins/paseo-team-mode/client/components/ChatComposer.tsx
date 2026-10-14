import React, { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  type NativeSyntheticEvent,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import type { ChatAttachment } from "../../shared/contracts.js";
import {
  imageFilesFromPaste,
  isSubmitKeyPress,
  readImageAttachments,
  type PasteEventLike,
  type WebKeyPressData,
} from "../chat-input.js";
import { SlashCommandMenu, type SlashCommand } from "./SlashCommandMenu.js";
import { ImageAttachmentBar } from "./ImageAttachmentBar.js";

export interface QuickPrompt {
  label: string;
  prompt: string;
}

/** `regular` is the single-agent view; `compact` is a column-sized composer in the parallel view. */
export type ComposerDensity = "regular" | "compact";

interface ChatComposerProps {
  theme: PluginSurfaceProps["theme"];
  density: ComposerDensity;
  targetSlotId: string;
  placeholder: string;
  quickPrompts: readonly QuickPrompt[];
  value: string;
  onChangeText: (text: string) => void;
  onSendPrompt: (slotId: string, prompt: string, attachments?: ChatAttachment[]) => Promise<void>;
  /** Rendered at the start of the quick-prompt bar, before the pills. */
  children?: ReactNode;
}

const HIDDEN_INPUT_STYLE = { display: "none" } as const;

export function ChatComposer({
  theme,
  density,
  targetSlotId,
  placeholder,
  quickPrompts,
  value,
  onChangeText,
  onSendPrompt,
  children,
}: ChatComposerProps) {
  const [sending, setSending] = useState(false);
  const [stagedAttachments, setStagedAttachments] = useState<ChatAttachment[]>([]);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const themed = useMemo(() => createComposerStyles(theme, density), [theme, density]);
  const isDisabled = (!value.trim() && stagedAttachments.length === 0) || sending;

  const handleChangeText = useCallback(
    (text: string) => {
      onChangeText(text);
      setShowSlashMenu(text.startsWith("/"));
    },
    [onChangeText],
  );

  const handleSlashSelect = useCallback(
    (cmd: SlashCommand) => {
      onChangeText(cmd.template);
      setShowSlashMenu(false);
    },
    [onChangeText],
  );

  const handleCloseSlashMenu = useCallback(() => setShowSlashMenu(false), []);

  const stagedCount = stagedAttachments.length;
  const stageImages = useCallback(
    async (files: File[], unnamedPrefix: string) => {
      const added = await readImageAttachments(files, unnamedPrefix, stagedCount);
      if (added.length > 0) setStagedAttachments((prev) => [...prev, ...added]);
    },
    [stagedCount],
  );

  // Web clipboard paste listener for images
  const handlePaste = useCallback(
    (e: PasteEventLike) => {
      stageImages(imageFilesFromPaste(e), "Pasted Image");
    },
    [stageImages],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = "";
      stageImages(files, "Image");
    },
    [stageImages],
  );

  const handleRemoveAttachment = useCallback((id: string) => {
    setStagedAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleAttach = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSend = useCallback(async () => {
    if ((!value.trim() && stagedAttachments.length === 0) || !targetSlotId || sending) return;
    const prompt = value.trim();
    const attachments = stagedAttachments.length > 0 ? [...stagedAttachments] : undefined;

    onChangeText("");
    setStagedAttachments([]);
    setShowSlashMenu(false);
    setSending(true);

    try {
      await onSendPrompt(targetSlotId, prompt, attachments);
    } finally {
      setSending(false);
    }
  }, [value, stagedAttachments, targetSlotId, sending, onChangeText, onSendPrompt]);

  const handleKeyPress = useCallback(
    (e: NativeSyntheticEvent<WebKeyPressData>) => {
      if (!isSubmitKeyPress(e)) return;
      e.preventDefault();
      handleSend();
    },
    [handleSend],
  );

  return (
    <View style={themed.container}>
      {/* Hidden file input for web attachment */}
      {typeof document !== "undefined" && (
        <input
          type="file"
          accept="image/*"
          multiple
          ref={fileInputRef}
          style={HIDDEN_INPUT_STYLE}
          onChange={handleFileChange}
        />
      )}

      {/* Floating Slash Command Menu */}
      {showSlashMenu && (
        <SlashCommandMenu
          query={value}
          theme={theme}
          onSelect={handleSlashSelect}
          onClose={handleCloseSlashMenu}
        />
      )}

      {/* Quick action pills (and whatever the parent puts before them) */}
      <View style={themed.quickBar}>
        {children}
        <View style={themed.pillRow}>
          {quickPrompts.map((quick) => (
            <QuickPromptPill
              key={quick.label}
              quick={quick}
              pillStyle={themed.pill}
              textStyle={themed.pillText}
              onSelect={onChangeText}
            />
          ))}
        </View>
      </View>

      {/* Staged Image Attachment Bar */}
      <ImageAttachmentBar
        attachments={stagedAttachments}
        theme={theme}
        onRemove={handleRemoveAttachment}
      />

      {/* Input & Send Action */}
      <View style={styles.inputRow}>
        <Pressable
          style={themed.attachBtn}
          onPress={handleAttach}
          accessibilityLabel="Attach Image"
        >
          <Text style={styles.attachIcon}>📎</Text>
        </Pressable>

        <View
          style={themed.inputWrapper}
          // @ts-ignore - web paste event
          onPaste={handlePaste}
        >
          <TextInput
            style={themed.input}
            multiline
            placeholder={placeholder}
            placeholderTextColor={theme.colors.foregroundMuted}
            value={value}
            onChangeText={handleChangeText}
            onKeyPress={handleKeyPress}
          />
        </View>

        <Pressable
          style={isDisabled ? themed.sendBtnDisabled : themed.sendBtnActive}
          onPress={handleSend}
          disabled={isDisabled}
        >
          <Text style={themed.sendBtnText}>{sending ? "Sending..." : "Send 🚀"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

interface QuickPromptPillProps {
  quick: QuickPrompt;
  pillStyle: ViewStyle;
  textStyle: TextStyle;
  onSelect: (prompt: string) => void;
}

function QuickPromptPill({ quick, pillStyle, textStyle, onSelect }: QuickPromptPillProps) {
  const handlePress = useCallback(() => onSelect(quick.prompt), [onSelect, quick.prompt]);
  return (
    <Pressable onPress={handlePress} style={pillStyle}>
      <Text style={textStyle}>{quick.label}</Text>
    </Pressable>
  );
}

interface ComposerStyles {
  container: ViewStyle;
  quickBar: ViewStyle;
  pillRow: ViewStyle;
  pill: ViewStyle;
  pillText: TextStyle;
  attachBtn: ViewStyle;
  inputWrapper: ViewStyle;
  input: TextStyle;
  sendBtnActive: ViewStyle;
  sendBtnDisabled: ViewStyle;
  sendBtnText: TextStyle;
}

function createComposerStyles(
  theme: PluginSurfaceProps["theme"],
  density: ComposerDensity,
): ComposerStyles {
  const { colors } = theme;
  const size = density === "compact" ? sizes.compact : sizes.regular;
  const send = (base: ViewStyle): ViewStyle =>
    StyleSheet.flatten([styles.sendBtn, size.sendBtn, base]);

  return {
    container: StyleSheet.flatten([
      styles.composer,
      size.composer,
      { backgroundColor: colors.surface1, borderTopColor: colors.border },
    ]),
    quickBar: size.quickBar,
    pillRow: size.pillRow,
    pill: StyleSheet.flatten([
      styles.pill,
      size.pill,
      { borderColor: colors.border, backgroundColor: colors.surface2 },
    ]),
    pillText: StyleSheet.flatten([styles.pillText, { color: colors.foreground }]),
    attachBtn: StyleSheet.flatten([
      styles.attachBtn,
      size.attachBtn,
      { backgroundColor: colors.surface2, borderColor: colors.border },
    ]),
    inputWrapper: StyleSheet.flatten([
      styles.inputWrapper,
      size.inputWrapper,
      { borderColor: "#6366f1", backgroundColor: colors.surface2 },
    ]),
    input: StyleSheet.flatten([styles.input, { color: colors.foreground }]),
    sendBtnActive: send(styles.sendBtnActive),
    sendBtnDisabled: send(styles.sendBtnDisabled),
    sendBtnText: StyleSheet.flatten([styles.sendBtnText, size.sendBtnText]),
  };
}

const styles = StyleSheet.create({
  composer: {
    borderTopWidth: 1,
    position: "relative",
  },
  pill: {
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
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  attachIcon: {
    fontSize: 16,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
  },
  input: {
    fontSize: 13,
    padding: 0,
  },
  sendBtn: {
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
    fontWeight: "700",
  },
});

/** The measurements that differ between the single-agent composer and the column composer. */
const sizes = {
  regular: StyleSheet.create({
    composer: { padding: 14 },
    quickBar: { flexDirection: "row", marginBottom: 10 },
    pillRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    pill: { paddingHorizontal: 10, paddingVertical: 4 },
    attachBtn: { width: 42, height: 42 },
    inputWrapper: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 42, maxHeight: 140 },
    sendBtn: { paddingHorizontal: 18, height: 42 },
    sendBtnText: { fontSize: 13 },
  }),
  compact: StyleSheet.create({
    composer: { padding: 10 },
    quickBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
      flexWrap: "wrap",
      gap: 6,
    },
    pillRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    pill: { paddingHorizontal: 8, paddingVertical: 3 },
    attachBtn: { width: 38, height: 38 },
    inputWrapper: { paddingHorizontal: 10, paddingVertical: 6, minHeight: 38, maxHeight: 120 },
    sendBtn: { paddingHorizontal: 16, height: 38 },
    sendBtnText: { fontSize: 12 },
  }),
};
