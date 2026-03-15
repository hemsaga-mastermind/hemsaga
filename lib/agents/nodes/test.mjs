/**
 * Test agent: runs lint and (if present) unit tests. Pushes results and any errors into state.
 */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function runCommand(cmd, cwd) {
  try {
    const out = execSync(cmd, {
      encoding: "utf8",
      cwd: cwd || path.resolve(__dirname, "../../.."),
    });
    return { ok: true, stdout: out || "", stderr: "" };
  } catch (e) {
    return {
      ok: false,
      stdout: (e.stdout && String(e.stdout)) || "",
      stderr: (e.stderr && String(e.stderr)) || e.message || "",
    };
  }
}

export function testNode(state) {
  const projectRoot = path.resolve(__dirname, "../../..");
  const errors = [];
  let lintResult = { ok: true };
  let testResult = { ok: true, message: "No test script" };

  lintResult = runCommand("npm run lint", projectRoot);
  if (!lintResult.ok) {
    errors.push(`Lint failed: ${lintResult.stderr || lintResult.stdout}`);
  }

  try {
    const pkg = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8"));
    if (pkg.scripts && pkg.scripts.test) {
      testResult = runCommand("npm test", projectRoot);
      if (!testResult.ok) {
        errors.push(`Tests failed: ${testResult.stderr || testResult.stdout}`);
      }
    }
  } catch (_) {
    // no package.json or no test script
  }

  const passed = lintResult.ok && testResult.ok;
  return {
    testResult: {
      lint: lintResult.ok,
      test: testResult.ok,
      stdout: lintResult.stdout || testResult.stdout,
      timestamp: new Date().toISOString(),
    },
    currentStep: "test",
    errors,
    passed: state.passed !== false && passed,
  };
}
