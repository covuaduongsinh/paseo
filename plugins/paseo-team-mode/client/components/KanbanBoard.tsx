import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, type TextStyle, type ViewStyle } from "react-native";
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import type { TeamTask, TeamSlot, TeamTaskStatus } from "../../shared/contracts.js";
import { getSlotColor } from "../theme/member-colors.js";

interface KanbanBoardProps {
  tasks: TeamTask[];
  slots: TeamSlot[];
  theme: PluginSurfaceProps["theme"];
}

const COLUMNS: { key: TeamTaskStatus; label: string; color: string }[] = [
  { key: "backlog", label: "Backlog", color: "#64748b" },
  { key: "in_progress", label: "In Progress", color: "#0ea5e9" },
  { key: "blocked", label: "Blocked", color: "#ef4444" },
  { key: "done", label: "Done", color: "#10b981" },
];

const NO_TASKS: TeamTask[] = [];

interface KanbanStyles {
  column: ViewStyle;
  colTitle: TextStyle;
  badge: TextStyle;
  taskCard: ViewStyle;
  taskTitle: TextStyle;
  taskDesc: TextStyle;
  unassigned: TextStyle;
  emptyText: TextStyle;
}

export function KanbanBoard({ tasks, slots, theme }: KanbanBoardProps) {
  const slotMap = useMemo(() => {
    const map = new Map<string, TeamSlot>();
    slots.forEach((s) => map.set(s.slotId, s));
    return map;
  }, [slots]);

  const tasksByStatus = useMemo(() => {
    const groups = new Map<TeamTaskStatus, TeamTask[]>();
    for (const task of tasks) {
      const group = groups.get(task.status);
      if (group) group.push(task);
      else groups.set(task.status, [task]);
    }
    return groups;
  }, [tasks]);

  const themed = useMemo<KanbanStyles>(
    () => ({
      column: StyleSheet.flatten([
        styles.column,
        { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border },
      ]),
      colTitle: StyleSheet.flatten([styles.colTitle, { color: theme.colors.foreground }]),
      badge: StyleSheet.flatten([styles.badge, { color: theme.colors.foregroundMuted }]),
      taskCard: StyleSheet.flatten([
        styles.taskCard,
        { backgroundColor: theme.colors.surface1, borderColor: theme.colors.border },
      ]),
      taskTitle: StyleSheet.flatten([styles.taskTitle, { color: theme.colors.foreground }]),
      taskDesc: StyleSheet.flatten([styles.taskDesc, { color: theme.colors.foregroundMuted }]),
      unassigned: StyleSheet.flatten([
        styles.unassignedText,
        { color: theme.colors.foregroundMuted },
      ]),
      emptyText: StyleSheet.flatten([styles.emptyText, { color: theme.colors.foregroundMuted }]),
    }),
    [theme],
  );

  return (
    <ScrollView horizontal style={styles.container} contentContainerStyle={styles.columnsWrapper}>
      {COLUMNS.map((col) => (
        <KanbanColumn
          key={col.key}
          column={col}
          tasks={tasksByStatus.get(col.key) ?? NO_TASKS}
          slotMap={slotMap}
          themed={themed}
        />
      ))}
    </ScrollView>
  );
}

interface KanbanColumnProps {
  column: (typeof COLUMNS)[number];
  tasks: TeamTask[];
  slotMap: Map<string, TeamSlot>;
  themed: KanbanStyles;
}

function KanbanColumn({ column, tasks, slotMap, themed }: KanbanColumnProps) {
  const dotStyle = useMemo(
    () => StyleSheet.flatten([styles.statusDot, { backgroundColor: column.color }]),
    [column.color],
  );

  return (
    <View style={themed.column}>
      <View style={styles.colHeader}>
        <View style={dotStyle} />
        <Text style={themed.colTitle}>{column.label}</Text>
        <Text style={themed.badge}>{tasks.length}</Text>
      </View>

      <ScrollView style={styles.taskList} showsVerticalScrollIndicator={false}>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            slot={task.assignedSlotId ? slotMap.get(task.assignedSlotId) : undefined}
            themed={themed}
          />
        ))}

        {tasks.length === 0 ? (
          <View style={styles.emptyCol}>
            <Text style={themed.emptyText}>No tasks</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

interface TaskCardProps {
  task: TeamTask;
  slot: TeamSlot | undefined;
  themed: KanbanStyles;
}

function TaskCard({ task, slot, themed }: TaskCardProps) {
  const slotColor = slot ? getSlotColor(slot.colorIndex) : undefined;
  const pillStyle = useMemo(
    () =>
      StyleSheet.flatten([
        styles.slotPill,
        { backgroundColor: slotColor?.badgeBg, borderColor: slotColor?.border },
      ]),
    [slotColor?.badgeBg, slotColor?.border],
  );
  const slotNameStyle = useMemo(
    () => StyleSheet.flatten([styles.slotName, { color: slotColor?.text }]),
    [slotColor?.text],
  );

  return (
    <View style={themed.taskCard}>
      <Text style={themed.taskTitle}>{task.title}</Text>
      {task.description ? (
        <Text style={themed.taskDesc} numberOfLines={3}>
          {task.description}
        </Text>
      ) : null}

      {task.blockerReason ? (
        <View style={styles.blockerBox}>
          <Text style={styles.blockerText}>⚠️ {task.blockerReason}</Text>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        {slot ? (
          <View style={pillStyle}>
            <Text style={slotNameStyle}>{slot.name}</Text>
          </View>
        ) : (
          <Text style={themed.unassigned}>Unassigned</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  columnsWrapper: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  column: {
    width: 280,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    flexDirection: "column",
    maxHeight: "100%",
  },
  colHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  colTitle: {
    fontSize: 14,
    fontWeight: "bold",
    flex: 1,
  },
  badge: {
    fontSize: 12,
    fontWeight: "600",
  },
  taskList: {
    flex: 1,
  },
  taskCard: {
    borderRadius: 6,
    borderWidth: 1,
    padding: 10,
    marginBottom: 8,
    gap: 6,
  },
  taskTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  taskDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  blockerBox: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    padding: 6,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#ef4444",
  },
  blockerText: {
    fontSize: 11,
    color: "#f87171",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  slotPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  slotName: {
    fontSize: 11,
    fontWeight: "600",
  },
  unassignedText: {
    fontSize: 11,
    fontStyle: "italic",
  },
  emptyCol: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 12,
  },
});
