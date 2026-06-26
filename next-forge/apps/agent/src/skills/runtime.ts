import path from "node:path";
import {
  buildModelMessages,
  createSkillResolverFromEnv,
  type Message,
  type SkillResolver,
} from "@repo/database";

const BASE_INSTRUCTIONS =
  "A helpful assistant that can check weather and help with various tasks.";

let cachedResolver: SkillResolver | undefined;

export function getSkillResolver(): SkillResolver {
  if (!cachedResolver) {
    const monorepoRoot = path.resolve(
      process.env.MODME_PROJECT_ROOT ?? path.join(process.cwd(), "..", "..")
    );
    cachedResolver = createSkillResolverFromEnv(monorepoRoot);
  }
  return cachedResolver;
}

export function buildSkillDiscoveryHint(resolver: SkillResolver): string {
  if (resolver.skillIndex.size === 0) {
    return "";
  }

  const sample = [...resolver.skillIndex.values()]
    .slice(0, 12)
    .map((meta) => `@${meta.id} (${meta.name})`)
    .join(", ");

  return (
    `\n\nCurated project skills are available via @skill-id lazy loading ` +
    `(max ${resolver.maxSkillsPerTurn} per turn). Examples: ${sample}.`
  );
}

export async function prepareModelMessages(
  trajectory: Message[],
  baseSystemMessages: Message[] = [{ role: "system", content: BASE_INSTRUCTIONS }]
): Promise<Message[]> {
  const resolver = getSkillResolver();
  return resolver.buildModelMessages({
    baseSystemMessages,
    trajectory,
  });
}

export { buildModelMessages, type Message, type SkillResolver };
