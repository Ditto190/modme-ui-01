"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./buildkite-demo.module.css";

type StepState = "idle" | "running" | "passed" | "failed";

interface PipelineStep {
  id: string;
  emoji: string;
  label: string;
  command: string;
  parallelGroup?: string;
  dependsOn: string[];
}

const PIPELINE: PipelineStep[] = [
  {
    id: "secret-guard",
    emoji: "🛡️",
    label: "Secret guard",
    command: ".buildkite/scripts/secret-guard.sh",
    dependsOn: [],
  },
  {
    id: "install",
    emoji: "🧶",
    label: "Install dependencies",
    command: "cd GenerativeUI_monorepo && yarn install",
    dependsOn: ["secret-guard"],
  },
  {
    id: "lint",
    emoji: "✓",
    label: "Lint",
    command: "yarn lint",
    parallelGroup: "verify",
    dependsOn: ["install"],
  },
  {
    id: "test",
    emoji: "🧪",
    label: "Test",
    command: "yarn test",
    parallelGroup: "verify",
    dependsOn: ["install"],
  },
  {
    id: "build",
    emoji: "📦",
    label: "Build",
    command: "yarn build",
    dependsOn: ["lint", "test"],
  },
  {
    id: "annotate",
    emoji: "🚀",
    label: "CI green",
    command: "buildkite-agent annotate",
    dependsOn: ["build"],
  },
];

const GLOSSARY = [
  {
    term: "Pipeline",
    def: "YAML in .buildkite/pipeline.yml — the recipe for your CI.",
  },
  {
    term: "Build",
    def: "One run of that recipe for a specific commit.",
  },
  {
    term: "Agent",
    def: "Machine that executes each step (hosted or yours).",
  },
  {
    term: "Step",
    def: "A single command with logs, timing, and pass/fail state.",
  },
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function BuildkiteDemo() {
  const [states, setStates] = useState<Record<string, StepState>>(
    () => Object.fromEntries(PIPELINE.map((s) => [s.id, "idle" as StepState]))
  );
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const appendLog = useCallback((line: string) => {
    setLog((prev) => [...prev.slice(-12), line]);
  }, []);

  const reset = useCallback(() => {
    setStates(
      Object.fromEntries(PIPELINE.map((s) => [s.id, "idle" as StepState]))
    );
    setLog([]);
    setRunning(false);
  }, []);

  const runPipeline = useCallback(async () => {
    if (running) return;
    reset();
    setRunning(true);
    appendLog("+++ buildkite-agent pipeline upload");

    const setStep = (id: string, state: StepState) =>
      setStates((prev) => ({ ...prev, [id]: state }));

    const runStep = async (step: PipelineStep) => {
      setStep(step.id, "running");
      appendLog(`--- ${step.label}`);
      appendLog(`$ ${step.command}`);
      await delay(400 + Math.random() * 500);
      setStep(step.id, "passed");
      appendLog(`+++ ${step.label} passed`);
    };

    await runStep(PIPELINE[0]);
    await runStep(PIPELINE[1]);

    const parallel = PIPELINE.filter((s) => s.parallelGroup === "verify");
    for (const step of parallel) {
      setStep(step.id, "running");
      appendLog(`--- ${step.label} (parallel)`);
    }
    await delay(700);
    for (const step of parallel) {
      setStep(step.id, "passed");
      appendLog(`+++ ${step.label} passed`);
    }

    await runStep(PIPELINE[4]);
    await runStep(PIPELINE[5]);

    appendLog("Build finished ✓");
    setRunning(false);
  }, [appendLog, reset, running]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !running) runPipeline();
      if (e.key === "Escape") reset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [runPipeline, reset, running]);

  return (
    <div className={styles.shell}>
      <div className={styles.grain} aria-hidden="true" />

      <header className={styles.header}>
        <p className={styles.eyebrow}>Monorepo_ModMe · CI/CD</p>
        <h1 className={styles.title}>
          What <span className={styles.accent}>Buildkite</span> does here
        </h1>
        <p className={styles.lead}>
          Buildkite runs shell commands on agents when you push code. This
          pipeline lint-tests-builds{" "}
          <code className={styles.inlineCode}>GenerativeUI_monorepo</code> —
          same job as GitHub Actions, different control plane.
        </p>
      </header>

      <div className={styles.grid}>
        <section className={styles.pipelinePanel} aria-label="Pipeline graph">
          <div className={styles.panelHead}>
            <span className={styles.dot} />
            <span>.buildkite/pipeline.yml</span>
          </div>

          <ol className={styles.stepList}>
            {PIPELINE.map((step, index) => {
              const state = states[step.id];
              const isParallel = step.parallelGroup === "verify";
              return (
                <li
                  key={step.id}
                  className={`${styles.step} ${styles[state]} ${
                    isParallel ? styles.parallel : ""
                  }`}
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className={styles.stepRail}>
                    <span className={styles.stepEmoji} aria-hidden="true">
                      {step.emoji}
                    </span>
                    {index < PIPELINE.length - 1 && (
                      <span className={styles.connector} aria-hidden="true" />
                    )}
                  </div>
                  <div className={styles.stepBody}>
                    <div className={styles.stepTop}>
                      <span className={styles.stepLabel}>{step.label}</span>
                      <span className={styles.badge} data-state={state}>
                        {state}
                      </span>
                    </div>
                    <code className={styles.stepCmd}>{step.command}</code>
                    {step.parallelGroup && (
                      <span className={styles.groupTag}>
                        group: {step.parallelGroup}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.runBtn}
              onClick={runPipeline}
              disabled={running}
            >
              {running ? "Running…" : "Simulate build"}
            </button>
            <button
              type="button"
              className={styles.resetBtn}
              onClick={reset}
              disabled={running}
            >
              Reset
            </button>
          </div>
          <p className={styles.hint}>Enter to run · Esc to reset</p>
        </section>

        <aside className={styles.side}>
          <div className={styles.logPanel}>
            <div className={styles.panelHead}>
              <span className={styles.dot} />
              <span>Agent log (simulated)</span>
            </div>
            <pre className={styles.log} aria-live="polite">
              {log.length === 0
                ? "Click Simulate build to watch steps execute…"
                : log.join("\n")}
            </pre>
          </div>

          <dl className={styles.glossary}>
            {GLOSSARY.map((item) => (
              <div key={item.term} className={styles.glossaryRow}>
                <dt>{item.term}</dt>
                <dd>{item.def}</dd>
              </div>
            ))}
          </dl>

          <nav className={styles.links}>
            <a
              href="https://buildkite.com/docs/guides/getting-started"
              target="_blank"
              rel="noopener noreferrer"
            >
              Buildkite getting started
            </a>
            <a
              href="https://github.com/buildkite/starter-pipeline-example"
              target="_blank"
              rel="noopener noreferrer"
            >
              Starter pipeline example
            </a>
          </nav>
        </aside>
      </div>
    </div>
  );
}
