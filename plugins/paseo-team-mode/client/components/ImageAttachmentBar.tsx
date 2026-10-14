import React, { useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import type { ChatAttachment } from "../../shared/contracts.js";

interface ImageAttachmentBarProps {
  attachments: ChatAttachment[];
  theme: PluginSurfaceProps["theme"];
  onRemove: (id: string) => void;
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

export function ImageAttachmentBar({ attachments, theme, onRemove }: ImageAttachmentBarProps) {
  const themed = useMemo(
    () => ({
      container: StyleSheet.flatten([
        styles.container,
        { backgroundColor: theme.colors.surface2, borderBottomColor: theme.colors.border },
      ]),
      card: StyleSheet.flatten([
        styles.card,
        { borderColor: theme.colors.border, backgroundColor: theme.colors.surface1 },
      ]),
      name: StyleSheet.flatten([styles.name, { color: theme.colors.foreground }]),
    }),
    [theme],
  );

  if (!attachments || attachments.length === 0) return null;

  return (
    <View style={themed.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {attachments.map((att) => (
          <AttachmentCard
            key={att.id}
            attachment={att}
            cardStyle={themed.card}
            nameStyle={themed.name}
            onRemove={onRemove}
          />
        ))}
      </ScrollView>
    </View>
  );
}

interface AttachmentCardProps {
  attachment: ChatAttachment;
  cardStyle: ViewStyle;
  nameStyle: TextStyle;
  onRemove: (id: string) => void;
}

function AttachmentCard({ attachment, cardStyle, nameStyle, onRemove }: AttachmentCardProps) {
  const source = useMemo(() => ({ uri: attachment.dataUrl }), [attachment.dataUrl]);
  const handleRemove = useCallback(() => onRemove(attachment.id), [onRemove, attachment.id]);

  return (
    <View style={cardStyle}>
      {attachment.dataUrl ? (
        <Image source={source} style={styles.thumbnail} resizeMode="cover" />
      ) : (
        <View style={styles.thumbnailPlaceholder}>
          <Text style={styles.placeholderIcon}>🖼️</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={nameStyle} numberOfLines={1} ellipsizeMode="middle">
          {attachment.name ?? "Pasted Image"}
        </Text>
      </View>
      <Pressable style={styles.removeBtn} onPress={handleRemove} hitSlop={HIT_SLOP}>
        <Text style={styles.removeIcon}>✕</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  scroll: {
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    padding: 4,
    paddingRight: 8,
    gap: 8,
    maxWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  thumbnail: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  thumbnailPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderIcon: {
    fontSize: 18,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 11,
    fontWeight: "500",
  },
  removeBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  removeIcon: {
    fontSize: 10,
    color: "#ef4444",
    fontWeight: "700",
  },
});
