import { BuildkiteDemo } from "@/components/buildkite/BuildkiteDemo";

export const metadata = {
  title: "Buildkite Pipeline Demo | Generative UI",
  description:
    "Interactive walkthrough of the Monorepo_ModMe Buildkite CI pipeline",
};

export default function BuildkiteDemoPage() {
  return <BuildkiteDemo />;
}
