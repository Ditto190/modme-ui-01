import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildModelMessages,
  collectReferencedSkillIds,
  createSkillResolver,
  loadSkillBodies,
  loadSkillIndex,
  type Message,
  mergeSkillIndexes,
  resolveSkillsFromMessages,
  type SkillMeta,
} from "./skill-loader";

const ESCAPES_SKILLS_ROOT = /escapes skills root/;
const REGULAR_DIRECTORY = /regular directory/;
const TOO_MANY_SKILLS = /Too many skills/;

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTempSkillsLayout(options?: {
  withEscapePath?: boolean;
  withSymlinkEscape?: boolean;
}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "modme-skills-"));
  tempDirs.push(root);

  const skillsRoot = path.join(root, "skills");
  const safeDir = path.join(skillsRoot, "safe-skill");
  fs.mkdirSync(safeDir, { recursive: true });
  fs.writeFileSync(path.join(safeDir, "SKILL.md"), "# Safe\n", "utf8");

  if (options?.withEscapePath) {
    const index: SkillMeta[] = [
      {
        id: "escape",
        path: "../outside",
        name: "Escape",
        description: "",
        category: "test",
        risk: "low",
        source: "test",
        date_added: null,
      },
    ];
    fs.writeFileSync(
      path.join(root, "skills_index.json"),
      JSON.stringify(index),
      "utf8"
    );
    return { root, skillsRoot };
  }

  if (options?.withSymlinkEscape) {
    const outside = path.join(root, "outside");
    fs.mkdirSync(outside, { recursive: true });
    fs.writeFileSync(path.join(outside, "SKILL.md"), "# Outside\n", "utf8");
    const linkDir = path.join(skillsRoot, "linked");
    fs.symlinkSync(outside, linkDir, "dir");

    const index: SkillMeta[] = [
      {
        id: "linked",
        path: "linked",
        name: "Linked",
        description: "",
        category: "test",
        risk: "low",
        source: "test",
        date_added: null,
      },
    ];
    fs.writeFileSync(
      path.join(root, "skills_index.json"),
      JSON.stringify(index),
      "utf8"
    );
    return { root, skillsRoot };
  }

  const index: SkillMeta[] = [
    {
      id: "safe-skill",
      path: "safe-skill",
      name: "Safe Skill",
      description: "A safe skill",
      category: "testing",
      risk: "low",
      source: "test",
      date_added: "2026-01-01",
    },
    {
      id: "other-skill",
      path: "other-skill",
      name: "Other",
      description: "",
      category: "testing",
      risk: "low",
      source: "test",
      date_added: null,
    },
  ];
  fs.writeFileSync(
    path.join(root, "skills_index.json"),
    JSON.stringify(index),
    "utf8"
  );

  const otherDir = path.join(skillsRoot, "other-skill");
  fs.mkdirSync(otherDir, { recursive: true });
  fs.writeFileSync(path.join(otherDir, "SKILL.md"), "# Other\n", "utf8");

  return { root, skillsRoot };
}

describe("collectReferencedSkillIds", () => {
  it("parses @skill-id references present in the index", () => {
    const index = new Map<string, SkillMeta>([
      [
        "next-forge",
        {
          id: "next-forge",
          path: "next-forge",
          name: "next-forge",
          description: "",
          category: "frontend",
          risk: "low",
          source: "project",
          date_added: null,
        },
      ],
    ]);

    const messages: Message[] = [
      { role: "user", content: "Use @next-forge and @unknown-skill please" },
    ];

    expect(collectReferencedSkillIds(messages, index)).toEqual(["next-forge"]);
  });

  it("supports nested ids with slashes", () => {
    const index = new Map<string, SkillMeta>([
      [
        "agent-squad/mason",
        {
          id: "agent-squad/mason",
          path: "agent-squad/mason",
          name: "Mason",
          description: "",
          category: "backend",
          risk: "low",
          source: "project",
          date_added: null,
        },
      ],
    ]);

    const messages: Message[] = [
      { role: "user", content: "Ask @agent-squad/mason" },
    ];
    expect(collectReferencedSkillIds(messages, index)).toEqual([
      "agent-squad/mason",
    ]);
  });
});

describe("resolveSkillsFromMessages", () => {
  it("caps skills at maxSkills", () => {
    const index = loadSkillIndex(
      path.join(makeTempSkillsLayout().root, "skills_index.json")
    );
    const messages: Message[] = [
      { role: "user", content: "Load @safe-skill and @other-skill" },
    ];

    expect(resolveSkillsFromMessages(messages, index, 1)).toHaveLength(1);
  });
});

describe("loadSkillBodies security", () => {
  it("rejects path traversal via manifest path", async () => {
    const { skillsRoot, root } = makeTempSkillsLayout({ withEscapePath: true });
    const index = loadSkillIndex(path.join(root, "skills_index.json"));
    const meta = index.get("escape");
    expect(meta).toBeDefined();
    if (!meta) {
      throw new Error("expected escape skill meta");
    }

    await expect(loadSkillBodies(skillsRoot, [meta])).rejects.toThrow(
      ESCAPES_SKILLS_ROOT
    );
  });

  it.skipIf(process.platform === "win32")(
    "rejects symlink escape for skill directory",
    async () => {
      const { skillsRoot, root } = makeTempSkillsLayout({
        withSymlinkEscape: true,
      });
      const index = loadSkillIndex(path.join(root, "skills_index.json"));
      const meta = index.get("linked");
      expect(meta).toBeDefined();
      if (!meta) {
        throw new Error("expected linked skill meta");
      }

      await expect(loadSkillBodies(skillsRoot, [meta])).rejects.toThrow(
        REGULAR_DIRECTORY
      );
    }
  );
});

describe("buildModelMessages overflowBehavior", () => {
  it("throws when overflowBehavior is error and too many skills referenced", async () => {
    const { root, skillsRoot } = makeTempSkillsLayout();
    const index = loadSkillIndex(path.join(root, "skills_index.json"));

    await expect(
      buildModelMessages({
        baseSystemMessages: [{ role: "system", content: "Base" }],
        trajectory: [{ role: "user", content: "@safe-skill @other-skill" }],
        skillIndex: index,
        skillsRoot,
        maxSkillsPerTurn: 1,
        overflowBehavior: "error",
      })
    ).rejects.toThrow(TOO_MANY_SKILLS);
  });
});

describe("createSkillResolver hybrid merge", () => {
  it("prefers project index over global for duplicate ids", () => {
    const project = new Map<string, SkillMeta>([
      [
        "dup",
        {
          id: "dup",
          path: "dup",
          name: "Project",
          description: "",
          category: "a",
          risk: "low",
          source: "project",
          date_added: null,
          rootKind: "project",
        },
      ],
    ]);
    const global = new Map<string, SkillMeta>([
      [
        "dup",
        {
          id: "dup",
          path: "dup",
          name: "Global",
          description: "",
          category: "b",
          risk: "low",
          source: "global",
          date_added: null,
          rootKind: "global",
        },
      ],
    ]);

    const merged = mergeSkillIndexes(project, global);
    expect(merged.get("dup")?.name).toBe("Project");
  });

  it("loads project manifest via createSkillResolver", () => {
    const { root } = makeTempSkillsLayout();
    const resolver = createSkillResolver({
      projectRoot: root,
      skillsRoot: path.join(root, "skills"),
      globalSkillsRoot: null,
    });

    expect(resolver.skillIndex.has("safe-skill")).toBe(true);
  });
});
