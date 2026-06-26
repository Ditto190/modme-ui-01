import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type SkillMetaSource = "project" | "global";
export type OverflowBehavior = "truncate" | "error";

export interface SkillMeta {
  id: string;
  path: string;
  name: string;
  description: string;
  category: string;
  risk: string;
  source: string;
  date_added: string | null;
  tags?: string[];
  /** Internal: which skills root resolves this entry */
  rootKind?: SkillMetaSource;
}

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

const SKILL_ID_REGEX = /@([a-zA-Z0-9-_./]+)/g;

export function collectReferencedSkillIds(
  messages: Message[],
  index: Map<string, SkillMeta>
): string[] {
  const referencedSkillIds = new Set<string>();

  for (const msg of messages) {
    if (!msg.content) continue;
    for (const match of msg.content.matchAll(SKILL_ID_REGEX)) {
      const id = match[1];
      if (index.has(id)) {
        referencedSkillIds.add(id);
      }
    }
  }

  return [...referencedSkillIds];
}

function assertValidMaxSkills(maxSkills: number): number {
  if (!Number.isInteger(maxSkills) || maxSkills < 1) {
    throw new Error("maxSkills must be a positive integer.");
  }
  return maxSkills;
}

function normalizeSkillMeta(meta: SkillMeta, rootKind: SkillMetaSource): SkillMeta {
  return {
    ...meta,
    description: meta.description ?? "",
    category: meta.category ?? "uncategorized",
    risk: meta.risk ?? "low",
    source: meta.source ?? rootKind,
    date_added: meta.date_added ?? null,
    rootKind,
  };
}

export function loadSkillIndex(indexPath: string, rootKind: SkillMetaSource = "project"): Map<string, SkillMeta> {
  const raw = fs.readFileSync(indexPath, "utf8");
  const arr = JSON.parse(raw) as SkillMeta[];
  const map = new Map<string, SkillMeta>();

  for (const meta of arr) {
    map.set(meta.id, normalizeSkillMeta(meta, rootKind));
  }

  return map;
}

export function mergeSkillIndexes(
  projectIndex: Map<string, SkillMeta>,
  globalIndex?: Map<string, SkillMeta>
): Map<string, SkillMeta> {
  const merged = new Map<string, SkillMeta>();

  for (const [id, meta] of projectIndex) {
    merged.set(id, normalizeSkillMeta(meta, "project"));
  }

  if (globalIndex) {
    for (const [id, meta] of globalIndex) {
      if (!merged.has(id)) {
        merged.set(id, normalizeSkillMeta(meta, "global"));
      }
    }
  }

  return merged;
}

function resolveGlobalIndexPath(globalSkillsRoot: string, projectRoot: string): string | undefined {
  const candidates = [
    path.join(globalSkillsRoot, "skills_index.json"),
    path.join(globalSkillsRoot, "data", "skills_index.json"),
    path.join(projectRoot, "data", "skills_index.json"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

export interface SkillResolverOptions {
  projectRoot: string;
  skillsIndexPath?: string;
  skillsRoot?: string;
  globalSkillsRoot?: string | null;
  globalSkillsIndexPath?: string;
  maxSkillsPerTurn?: number;
  overflowBehavior?: OverflowBehavior;
}

export interface SkillResolver {
  skillIndex: Map<string, SkillMeta>;
  projectSkillsRoot: string;
  globalSkillsRoot?: string;
  maxSkillsPerTurn: number;
  overflowBehavior: OverflowBehavior;
  buildModelMessages(
    options: Omit<
      BuildMessagesOptions,
      "skillIndex" | "skillsRoot" | "globalSkillsRoot" | "maxSkillsPerTurn" | "overflowBehavior"
    >
  ): Promise<Message[]>;
}

export function createSkillResolver(options: SkillResolverOptions): SkillResolver {
  const projectRoot = path.resolve(options.projectRoot);
  const skillsIndexPath =
    options.skillsIndexPath ?? path.join(projectRoot, "skills_index.json");
  const projectSkillsRoot = path.resolve(
    options.skillsRoot ?? path.join(projectRoot, ".agents/skills")
  );
  const maxSkillsPerTurn = options.maxSkillsPerTurn ?? 8;
  const overflowBehavior = options.overflowBehavior ?? "truncate";

  const projectIndex = fs.existsSync(skillsIndexPath)
    ? loadSkillIndex(skillsIndexPath, "project")
    : new Map<string, SkillMeta>();

  let globalSkillsRoot: string | undefined;
  let globalIndex: Map<string, SkillMeta> | undefined;

  if (options.globalSkillsRoot !== null) {
    const resolvedGlobalRoot = path.resolve(
      options.globalSkillsRoot ?? path.join(os.homedir(), ".cursor", "skills")
    );

    if (fs.existsSync(resolvedGlobalRoot)) {
      globalSkillsRoot = resolvedGlobalRoot;
      const globalIndexPath =
        options.globalSkillsIndexPath ??
        resolveGlobalIndexPath(resolvedGlobalRoot, projectRoot);

      if (globalIndexPath && fs.existsSync(globalIndexPath)) {
        globalIndex = loadSkillIndex(globalIndexPath, "global");
      }
    }
  }

  const skillIndex = mergeSkillIndexes(projectIndex, globalIndex);

  return {
    skillIndex,
    projectSkillsRoot,
    globalSkillsRoot,
    maxSkillsPerTurn,
    overflowBehavior,
    buildModelMessages: (opts) =>
      buildModelMessages({
        ...opts,
        skillIndex,
        skillsRoot: projectSkillsRoot,
        globalSkillsRoot,
        maxSkillsPerTurn,
        overflowBehavior,
      }),
  };
}

export function createSkillResolverFromEnv(cwd = process.cwd()): SkillResolver {
  const overflow = process.env.MODME_SKILLS_OVERFLOW;
  const overflowBehavior: OverflowBehavior =
    overflow === "error" ? "error" : "truncate";

  return createSkillResolver({
    projectRoot: process.env.MODME_PROJECT_ROOT ?? cwd,
    skillsIndexPath: process.env.MODME_SKILLS_INDEX_PATH,
    skillsRoot: process.env.MODME_SKILLS_ROOT,
    globalSkillsRoot:
      process.env.MODME_SKILLS_GLOBAL_ROOT === "none"
        ? null
        : process.env.MODME_SKILLS_GLOBAL_ROOT,
    maxSkillsPerTurn: Number.parseInt(process.env.MODME_MAX_SKILLS_PER_TURN ?? "8", 10),
    overflowBehavior,
  });
}

export function resolveSkillsFromMessages(
  messages: Message[],
  index: Map<string, SkillMeta>,
  maxSkills: number
): SkillMeta[] {
  const skillLimit = assertValidMaxSkills(maxSkills);
  const referencedSkillIds = collectReferencedSkillIds(messages, index);

  const metas: SkillMeta[] = [];
  for (const id of referencedSkillIds) {
    const meta = index.get(id);
    if (meta) {
      metas.push(meta);
    }
    if (metas.length >= skillLimit) {
      break;
    }
  }

  return metas;
}

export async function loadSkillBodies(skillsRoot: string, metas: SkillMeta[]): Promise<string[]> {
  const bodies: string[] = [];
  const rootPath = path.resolve(skillsRoot);
  const rootRealPath = await fs.promises.realpath(rootPath);

  for (const meta of metas) {
    const skillDirPath = path.resolve(rootPath, meta.path);
    const relativePath = path.relative(rootPath, skillDirPath);

    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      throw new Error(`Skill path escapes skills root: ${meta.id}`);
    }

    const skillDirStat = await fs.promises.lstat(skillDirPath);
    if (!skillDirStat.isDirectory() || skillDirStat.isSymbolicLink()) {
      throw new Error(
        `Skill directory must be a regular directory inside the skills root: ${meta.id}`
      );
    }

    const fullPath = path.join(skillDirPath, "SKILL.md");
    const skillFileStat = await fs.promises.lstat(fullPath);
    if (!skillFileStat.isFile() || skillFileStat.isSymbolicLink()) {
      throw new Error(`SKILL.md must be a regular file inside the skills root: ${meta.id}`);
    }

    const realPath = await fs.promises.realpath(fullPath);
    const realRelativePath = path.relative(rootRealPath, realPath);
    if (realRelativePath.startsWith("..") || path.isAbsolute(realRelativePath)) {
      throw new Error(`SKILL.md resolves outside the skills root: ${meta.id}`);
    }

    const text = await fs.promises.readFile(realPath, "utf8");
    bodies.push(text);
  }

  return bodies;
}

export async function loadSkillBodiesHybrid(
  projectSkillsRoot: string,
  globalSkillsRoot: string | undefined,
  metas: SkillMeta[]
): Promise<string[]> {
  const bodies: string[] = [];

  for (const meta of metas) {
    const root =
      meta.rootKind === "global" && globalSkillsRoot ? globalSkillsRoot : projectSkillsRoot;
    const chunk = await loadSkillBodies(root, [meta]);
    bodies.push(...chunk);
  }

  return bodies;
}

export interface BuildMessagesOptions {
  baseSystemMessages: Message[];
  trajectory: Message[];
  skillIndex: Map<string, SkillMeta>;
  skillsRoot: string;
  globalSkillsRoot?: string;
  maxSkillsPerTurn?: number;
  overflowBehavior?: OverflowBehavior;
}

export async function buildModelMessages(options: BuildMessagesOptions): Promise<Message[]> {
  const {
    baseSystemMessages,
    trajectory,
    skillIndex,
    skillsRoot,
    globalSkillsRoot,
    maxSkillsPerTurn = 8,
    overflowBehavior = "truncate",
  } = options;
  const skillLimit = assertValidMaxSkills(maxSkillsPerTurn);
  const referencedSkillIds = collectReferencedSkillIds(trajectory, skillIndex);

  if (overflowBehavior === "error" && referencedSkillIds.length > skillLimit) {
    throw new Error(
      `Too many skills requested in a single turn. Reduce @skill-id usage to ${skillLimit} or fewer.`
    );
  }

  const selectedMetas = resolveSkillsFromMessages(trajectory, skillIndex, skillLimit);

  if (selectedMetas.length === 0) {
    return [...baseSystemMessages, ...trajectory];
  }

  const skillBodies = globalSkillsRoot
    ? await loadSkillBodiesHybrid(skillsRoot, globalSkillsRoot, selectedMetas)
    : await loadSkillBodies(skillsRoot, selectedMetas);

  const skillMessages: Message[] = skillBodies.map((body) => ({
    role: "system",
    content: body,
  }));

  return [...baseSystemMessages, ...skillMessages, ...trajectory];
}
