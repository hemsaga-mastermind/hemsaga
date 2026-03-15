/**
 * LangGraph pipeline: plan → develop → test → security → ui.
 * Keeps the development cycle well tested by running each agent in sequence.
 */
import { StateGraph, START, END } from "@langchain/langgraph";
import { PipelineState } from "./state.mjs";
import { planNode } from "./nodes/plan.mjs";
import { developNode } from "./nodes/develop.mjs";
import { testNode } from "./nodes/test.mjs";
import { securityNode } from "./nodes/security.mjs";
import { uiNode } from "./nodes/ui.mjs";

const builder = new StateGraph(PipelineState)
  .addNode("plan_agent", planNode)
  .addNode("develop_agent", developNode)
  .addNode("test_agent", testNode)
  .addNode("security_agent", securityNode)
  .addNode("ui_agent", uiNode)
  .addEdge(START, "plan_agent")
  .addEdge("plan_agent", "develop_agent")
  .addEdge("develop_agent", "test_agent")
  .addEdge("test_agent", "security_agent")
  .addEdge("security_agent", "ui_agent")
  .addEdge("ui_agent", END);

const pipeline = builder.compile();

export { pipeline, PipelineState };
