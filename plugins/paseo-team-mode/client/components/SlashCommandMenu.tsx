import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";

export interface SlashCommand {
  command: string;
  icon: string;
  label: string;
  description: string;
  template: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    command: "/plan",
    icon: "🏗️",
    label: "/plan",
    description: "Phân tích yêu cầu & lập kế hoạch kiến trúc cho team",
    template: "/plan Phân tích yêu cầu và lập kế hoạch triển khai chi tiết cho team: ",
  },
  {
    command: "/task",
    icon: "📋",
    label: "/task",
    description: "Tạo task mới lên bảng Kanban cho thành viên",
    template: "/task [Tên task] Giao cho Coder Agent thực hiện",
  },
  {
    command: "/delegate",
    icon: "🤝",
    label: "/delegate",
    description: "Giao việc và chỉ định công việc cụ thể cho Teammate",
    template: "/delegate @Teammate Hãy triển khai module: ",
  },
  {
    command: "/review",
    icon: "🔍",
    label: "/review",
    description: "Yêu cầu Reviewer Agent kiểm tra mã nguồn & security",
    template: "/review Kiểm tra toàn bộ mã nguồn vừa viết và báo cáo các lỗi tiềm ẩn",
  },
  {
    command: "/test",
    icon: "✅",
    label: "/test",
    description: "Viết unit test & chạy kiểm thử tự động",
    template: "/test Viết unit test và kiểm tra regression cho module",
  },
  {
    command: "/status",
    icon: "📊",
    label: "/status",
    description: "Tổng hợp báo cáo tiến độ và blocker của toàn team",
    template: "/status",
  },
  {
    command: "/clear",
    icon: "🧹",
    label: "/clear",
    description: "Xóa sạch lịch sử tin nhắn của slot hiện tại",
    template: "/clear",
  },
  {
    command: "/help",
    icon: "💡",
    label: "/help",
    description: "Xem bảng hướng dẫn sử dụng các lệnh Team Mode",
    template: "/help",
  },
];

interface SlashCommandMenuProps {
  query: string;
  theme: PluginSurfaceProps["theme"];
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

export function SlashCommandMenu({ query, theme, onSelect, onClose }: SlashCommandMenuProps) {
  const cleanQuery = query.startsWith("/") ? query.slice(1).toLowerCase() : query.toLowerCase();

  const filteredCommands = SLASH_COMMANDS.filter((cmd) => {
    if (!cleanQuery) return true;
    return (
      cmd.command.toLowerCase().includes(cleanQuery) ||
      cmd.label.toLowerCase().includes(cleanQuery) ||
      cmd.description.toLowerCase().includes(cleanQuery)
    );
  });

  if (filteredCommands.length === 0) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface1,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text style={[styles.headerTitle, { color: theme.colors.foregroundMuted }]}>
          ⚡ Team Slash Commands ({filteredCommands.length})
        </Text>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Text style={{ color: theme.colors.foregroundMuted, fontSize: 11 }}>✕ ESC</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.list} keyboardShouldPersistTaps="always">
        {filteredCommands.map((cmd) => (
          <Pressable
            key={cmd.command}
            style={({ hovered }: any) => [
              styles.item,
              hovered && { backgroundColor: theme.colors.surface2 },
            ]}
            onPress={() => onSelect(cmd)}
          >
            <View style={styles.iconWrapper}>
              <Text style={styles.icon}>{cmd.icon}</Text>
            </View>
            <View style={styles.infoWrapper}>
              <Text style={[styles.cmdName, { color: theme.colors.foreground }]}>{cmd.label}</Text>
              <Text style={[styles.cmdDesc, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
                {cmd.description}
              </Text>
            </View>
            <Text style={[styles.selectHint, { color: theme.colors.foregroundMuted }]}>↵</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: "100%",
    left: 12,
    right: 12,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    maxHeight: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 2,
  },
  list: {
    maxHeight: 240,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  icon: {
    fontSize: 15,
  },
  infoWrapper: {
    flex: 1,
  },
  cmdName: {
    fontSize: 13,
    fontWeight: "700",
  },
  cmdDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  selectHint: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 4,
  },
});
