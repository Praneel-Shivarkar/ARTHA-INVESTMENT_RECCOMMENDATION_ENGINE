import { runMonteCarloSimulation } from "@/lib/core/monte_carlo";
import { MonteCarloInput } from "@/lib/types";

self.onmessage = (event: MessageEvent<MonteCarloInput>) => {
  const result = runMonteCarloSimulation(event.data);
  self.postMessage(result);
};

export {};
