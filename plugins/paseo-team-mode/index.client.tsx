import React, { useCallback } from "react";
import type {
  PluginClientContext,
  PluginSidebarItemProps,
  PluginWorkspacePanelProps,
} from "@getpaseo/plugin/client";
import { SidebarRow } from "@getpaseo/plugin/client/ui";
import { TeamDashboardScreen } from "./client/TeamDashboardScreen.js";

// Keyed by workspace so switching workspaces resets the selected team and its polling.
function WorkspaceTeamBoard({ workspaceId, ...surfaceProps }: PluginWorkspacePanelProps) {
  return <TeamDashboardScreen key={workspaceId} workspaceId={workspaceId} {...surfaceProps} />;
}

function TeamSidebarItem({ currentScreen, openScreen }: PluginSidebarItemProps) {
  const open = useCallback(() => openScreen({ screenId: "teams" }), [openScreen]);
  return <SidebarRow icon="Users" active={currentScreen?.screenId === "teams"} onPress={open} />;
}

export default function contribute(plugin: PluginClientContext) {
  // 1. Full Screen Team Dashboard
  plugin.addScreen({
    id: "teams",
    title: "Teams",
    Component: TeamDashboardScreen,
  });

  // 2. Sidebar Navigation Item
  plugin.addSidebarHeaderItem({
    id: "teams",
    title: "Teams",
    Component: TeamSidebarItem,
  });

  // 3. Workspace Panel (Tab in Workspace beside Editor/Diffs)
  plugin.addWorkspacePanel({
    id: "team-board",
    title: "Team Board",
    icon: "Users",
    context: "workspace",
    locations: ["workspace", "explorer"],
    Component: WorkspaceTeamBoard,
  });

  return () => {
    // Cleanup if needed
  };
}
