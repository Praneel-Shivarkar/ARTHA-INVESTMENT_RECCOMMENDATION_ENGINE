import { inngest } from "@/inngest/client";

export const persistSimulationRequested = inngest.createFunction(
  { id: "persist-simulation-requested" },
  { event: "simulation/requested" },
  async ({ event }) => {
    return {
      persisted: true,
      portfolioId: event.data.portfolioId ?? "demo-portfolio",
      requestedAt: new Date().toISOString()
    };
  }
);

export const functions = [persistSimulationRequested];
