# Development pipeline (LangGraph)

This folder implements a **LangGraph**-based pipeline that runs development, testing, security, and UI checks in sequence so the cycle stays well tested.

## Flow

```
plan_agent → develop_agent → test_agent → security_agent → ui_agent → END
```

| Node            | Role |
|-----------------|------|
| **plan_agent**  | Interprets the task and produces a plan (stub; can be wired to an LLM later). |
| **develop_agent** | Placeholder for code generation or validation; currently records readiness. |
| **test_agent**  | Runs `npm run lint` and `npm test` (if present). |
| **security_agent** | Runs `npm audit --audit-level=high`. |
| **ui_agent**     | Runs `npx next build` to validate the app. |

State is shared across nodes (task, plan, results, errors, passed). The pipeline fails (exit code 1) if any of test, security, or build fail.

## Run

```bash
npm run pipeline
```

With a custom task description:

```bash
node scripts/run-pipeline.mjs "Add new API route for memories export"
```

## Extending

- **Plan**: Wire `plan_agent` to an LLM to turn the task into a concrete plan (e.g. file list, steps).
- **Develop**: Add formatters, codegen, or LLM-based patches in `develop_agent`.
- **Conditional edges**: Use `addConditionalEdges` to retry develop if test fails, or to branch on security findings.
- **Human-in-the-loop**: Use LangGraph’s interrupt/resume so a human approves before deploy.

## Files

- `state.mjs` – Shared state schema (Annotation.Root).
- `graph.mjs` – StateGraph definition and compile.
- `nodes/*.mjs` – One file per agent (plan, develop, test, security, ui).
- `scripts/run-pipeline.mjs` – CLI that invokes the graph and prints results.
