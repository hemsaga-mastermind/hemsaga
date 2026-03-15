/**
 * Plan agent: interprets the task and produces a short plan (stub; can be wired to LLM later).
 */
export function planNode(state) {
  const task = state.task || "Run full pipeline (lint, test, security, build).";
  const plan = {
    summary: task,
    steps: ["develop", "test", "security", "ui"],
    timestamp: new Date().toISOString(),
  };
  return {
    plan,
    currentStep: "plan",
    errors: [],
  };
}
