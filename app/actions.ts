"use server";

import { createInitialProfileInput } from "@/lib/core/defaults";
import { buildPortfolioFromInputs } from "@/lib/core/engine";

export async function generateDemoPlanAction() {
  return buildPortfolioFromInputs(createInitialProfileInput());
}
