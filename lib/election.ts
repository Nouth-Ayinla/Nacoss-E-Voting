import { withDbRequestContext } from "./db-context";

export async function syncElectionState() {
  // Read config under public role
  const config = await withDbRequestContext({ role: "public" }, async (tx) => {
    return tx.electionConfig.findUnique({ where: { id: 1 } });
  });

  if (!config) return null;

  const now = new Date();
  let targetState = config.state;

  if (config.state === "upcoming" && config.startTime && now >= new Date(config.startTime)) {
    targetState = "ongoing";
  }
  if (targetState === "ongoing" && config.endTime && now >= new Date(config.endTime)) {
    targetState = "ended";
  }

  if (targetState !== config.state) {
    // Perform update under 'admin' request role to bypass public RLS UPDATE restrictions
    return await withDbRequestContext({ role: "admin" }, async (tx) => {
      // Re-fetch inside transaction to avoid race conditions
      const latest = await tx.electionConfig.findUnique({ where: { id: 1 } });
      if (latest && latest.state !== targetState) {
        return tx.electionConfig.update({
          where: { id: 1 },
          data: { state: targetState },
        });
      }
      return latest;
    });
  }

  return config;
}
