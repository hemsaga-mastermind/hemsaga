/**
 * Shared state for the development pipeline graph.
 * Used by plan → develop → test → security → ui agents.
 */
import { Annotation } from "@langchain/langgraph";

const PipelineState = Annotation.Root({
  task: Annotation(),
  plan: Annotation(),
  developResult: Annotation(),
  testResult: Annotation(),
  securityResult: Annotation(),
  uiResult: Annotation(),
  errors: Annotation({
    reducer: (left, right) => (left || []).concat(right || []),
    default: () => [],
  }),
  currentStep: Annotation(),
  passed: Annotation(),
});

export { PipelineState };
