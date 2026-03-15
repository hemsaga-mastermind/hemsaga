#!/usr/bin/env node
/**
 * Run the LangGraph development pipeline: plan → develop → test → security → ui.
 * Usage: node scripts/run-pipeline.mjs [task description]
 * Or:    npm run pipeline
 * Or:    npm run pipeline -- "Add new API route for X"
 */
import { pipeline } from "../lib/agents/graph.mjs";

const task = process.argv.slice(2).join(" ") || "Run full pipeline (lint, test, security, build).";

async function main() {
  console.log("Pipeline starting:", task);
  console.log("---");

  const result = await pipeline.invoke({ task });

  console.log("Plan:", JSON.stringify(result.plan, null, 2));
  console.log("Develop:", JSON.stringify(result.developResult, null, 2));
  console.log("Test:", JSON.stringify(result.testResult, null, 2));
  console.log("Security:", JSON.stringify(result.securityResult, null, 2));
  console.log("UI (build):", JSON.stringify(result.uiResult, null, 2));
  if (result.errors && result.errors.length) {
    console.error("Errors:", result.errors);
  }
  console.log("---");
  console.log("Passed:", result.passed);

  process.exit(result.passed ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
