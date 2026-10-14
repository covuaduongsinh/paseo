import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
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

export function KanbanBoard({ tasks, slots, theme }: KanbanBoardProps) {
  const slotMap = useMemo(() => {
    const map = new Map<string, TeamSlot>();
    slots.forEach((s) => map.set(s.slotId, s));
    return map;
  }, [slots]);

  return (
    <ScrollView horizontal style={styles.container} contentContainerStyle={styles.columnsWrapper}>
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.key);
        return (
          <View
            key={col.key}
            style={[
              styles.column,
              {
                backgroundColor: theme.colors.surface2,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={styles.colHeader}>
              <View style={[styles.statusDot, { backgroundColor: col.color }]} />
              <Text style={[styles.colTitle, { color: theme.colors.foreground }]}>{col.label}</Text>
              <Text style={[styles.badge, { color: theme.colors.foregroundMuted }]}>
                {colTasks.length}
              </Text>
            </View>

            <ScrollView style={styles.taskList} showsVerticalScrollIndicator={false}>
              {colTasks.map((task) => {
                const slot = task.assignedSlotId ? slotMap.get(task.assignedSlotId) : undefined;
                const slotColor = slot ? getSlotColor(slot.colorIndex) : undefined;

                return (
                  <View
                    key={task.id}
                    style={[
                      styles.taskCard,
                      {
                        backgroundColor: theme.colors.surface1,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.taskTitle, { color: theme.colors.foreground }]}>
                      {task.title}
                    </Text>
                    {task.description ? (
                      <Text
                        style={[styles.taskDesc, { color: theme.colors.foregroundMuted }]}
                        numberOfLines={3}
                      >
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
                        <View
                          style={[
                            styles.slotPill,
                            {
                              backgroundColor: slotColor?.badgeBg,
                              borderColor: slotColor?.border,
                            },
                          ]}
                        >
                          <Text style={[styles.slotName, { color: slotColor?.text }]}>
                            {slot.name}
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={[styles.unassignedText, { color: theme.colors.foregroundMuted }]}
                        >
                          Unassigned
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}

              {colTasks.length === 0 ? (
                <View style={styles.emptyCol}>
                  <Text style={[styles.emptyText, { color: theme.colors.foregroundMuted }]}>
                    No tasks
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        );
      })}
    </ScrollView>
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
