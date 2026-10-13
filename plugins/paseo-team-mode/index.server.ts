import type { PluginServerContext } from "@getpaseo/plugin/server";
import { TeamStore } from "./server/team-store.js";
import { registerTeamRpcs } from "./server/rpc-handlers.js";

export default function contribute(server: PluginServerContext) {
  const store = new TeamStore();

  // 1. Register RPC endpoints for frontend
  registerTeamRpcs(server, store);

  // 2. Hook into agent creation to inject Team environment
  server.before("agent.create", ({ request }) => {
    // If agent is created with team tags or labels, inject environment variables
    return {
      ...request,
      env: {
        ...request.env,
        PASEO_TEAM_MODE_ENABLED: "1",
      },
    };
  });

  // 3. Hook into turn finished events to track progress
  server.on("agent.turn_ended", async (event, _context) => {
    if (event.outcome.kind === "canceled") {
      return;
    }
    // Automatically observe outputs for task completions or blockers
  });

  return () => {
    // Cleanup if needed
  };
}
