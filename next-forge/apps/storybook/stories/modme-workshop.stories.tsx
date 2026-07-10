import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

/**
 * ModMe workshop — GenerativeCanvas migration targets.
 * Build here first; port to apps/app as client islands (RSC shell + 'use client' leaf).
 */
const meta = {
  title: "ModMe/Workshop",
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const AgentStatusBadge: Story = {
  render: () => (
    <div className="flex flex-col items-center gap-4">
      <Badge variant="secondary">Agent idle</Badge>
      <Badge>Streaming</Badge>
      <Badge variant="destructive">Disconnected</Badge>
    </div>
  ),
};

export const ConnectionStatusBar: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <div className="size-3 rounded-full bg-emerald-500" />
        <span className="text-muted-foreground text-sm">Connected</span>
      </div>
      <span className="text-muted-foreground text-sm">
        Agent: <span className="font-medium text-foreground">ready</span>
      </span>
      <Badge variant="outline">Running tool…</Badge>
    </div>
  ),
};

export const ReconnectingStatusBar: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border p-4">
      <div className="flex items-center gap-2">
        <div className="size-3 animate-pulse rounded-full bg-amber-500" />
        <span className="text-muted-foreground text-sm">Reconnecting (2)…</span>
      </div>
      <output className="text-amber-600 text-sm dark:text-amber-400">
        Connection lost. Reconnecting…
      </output>
    </div>
  ),
};

export const StreamingTextPreview: Story = {
  render: () => (
    <div className="w-96 rounded-xl border bg-card p-6">
      <p className="text-sm leading-relaxed">
        Generating a card component with KPI metrics
        <span className="ml-1 inline-block animate-pulse">▍</span>
      </p>
    </div>
  ),
};

export const RenderComponentText: Story = {
  render: () => (
    <div className="w-96 rounded-xl border bg-card p-6">
      <h3 className="mb-2 font-semibold text-lg">Summary</h3>
      <p className="text-muted-foreground">
        Agent-generated text block for the canvas.
      </p>
    </div>
  ),
};

export const RenderComponentCard: Story = {
  render: () => (
    <div className="w-96 rounded-xl border bg-card p-6">
      <h3 className="mb-2 font-semibold text-lg">Revenue KPI</h3>
      <p className="mb-4 text-muted-foreground">Quarterly performance</p>
      <pre className="overflow-x-auto rounded-md bg-muted p-4 text-xs">
        {JSON.stringify({ value: 128_400, delta: "+12%" }, null, 2)}
      </pre>
    </div>
  ),
};

export const RenderComponentList: Story = {
  render: () => (
    <div className="w-96 rounded-xl border bg-card p-6">
      <h3 className="mb-2 font-semibold text-lg">Action items</h3>
      <ul className="list-inside list-disc space-y-1 text-muted-foreground">
        <li>Connect agent-server on port 8000</li>
        <li>Send a prompt to render UI</li>
        <li>Verify streaming tokens</li>
      </ul>
    </div>
  ),
};

export const ConnectionErrorPanel: Story = {
  render: () => (
    <div className="max-w-md space-y-4 rounded-xl border border-destructive/30 p-6">
      <h2 className="font-bold text-destructive text-xl">Connection error</h2>
      <p className="text-muted-foreground text-sm">
        WebSocket to agent-server failed. Check port 8000 and
        NEXT_PUBLIC_AGENT_SERVER_WS_URL.
      </p>
      <Button type="button" variant="outline">
        Retry connection
      </Button>
    </div>
  ),
};

export const ChatBubbles: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-2">
      <div className="ml-auto max-w-[85%] rounded-lg bg-primary/15 px-4 py-2 text-primary text-sm">
        Summarize the dashboard state
      </div>
      <div className="mr-auto max-w-[85%] rounded-lg bg-muted px-4 py-2 text-sm">
        Here is a generative UI block for your request…
      </div>
      <div className="mr-auto max-w-[85%] rounded-lg bg-muted px-4 py-2 text-sm opacity-70">
        Streaming response…
      </div>
    </div>
  ),
};

export const CanvasSkeleton: Story = {
  render: () => (
    <div className="w-96 space-y-4 rounded-xl border p-6">
      <p className="text-muted-foreground text-sm">Synthesizing interface…</p>
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-8 w-1/2" />
    </div>
  ),
};

export const CanvasActions: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button type="button" variant="default">
        Run agent
      </Button>
      <Button type="button" variant="outline">
        Reset canvas
      </Button>
    </div>
  ),
};

function PromptComposerPreview() {
  const [draft, setDraft] = useState("");
  return (
    <form
      className="flex w-96 gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        setDraft("");
      }}
    >
      <Input
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Ask the agent…"
        value={draft}
      />
      <Button disabled={!draft.trim()} type="submit">
        Send
      </Button>
    </form>
  );
}

export const PromptComposer: Story = {
  render: () => <PromptComposerPreview />,
};

export const WorkshopNote: Story = {
  render: () => (
    <p className="max-w-md text-center text-muted-foreground text-sm">
      Parity target:{" "}
      <code className="rounded bg-muted px-1">generative-canvas.tsx</code> in{" "}
      <code className="rounded bg-muted px-1">
        apps/app/(authenticated)/generative-ui
      </code>
      . Gated by <code className="rounded bg-muted px-1">showGenerativeUi</code>{" "}
      feature flag. See{" "}
      <code className="rounded bg-muted px-1">modme-generative-ui-migrate</code>{" "}
      skill.
    </p>
  ),
};

/** Fallback UI pattern — production uses apps/app/error.tsx ('use client'). */
function AgentErrorBoundaryPreview() {
  const [hasError, setHasError] = useState(true);

  if (hasError) {
    return (
      <div className="max-w-md space-y-4 rounded-xl border border-destructive/30 p-6">
        <h2 className="font-bold text-destructive text-xl">Agent UI error</h2>
        <p className="text-muted-foreground text-sm">
          The generative canvas failed to render. Retry or reset the session.
        </p>
        <Button
          onClick={() => setHasError(false)}
          type="button"
          variant="outline"
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-md rounded-xl border p-6 text-sm">
      Agent panel recovered — wrap with <code>error.tsx</code> in production.
    </div>
  );
}

export const AgentErrorBoundary: Story = {
  render: () => <AgentErrorBoundaryPreview />,
};

function CanvasShellPreview() {
  const [draft, setDraft] = useState("");

  return (
    <div className="flex w-[28rem] flex-col gap-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground text-sm">Connected</span>
        </div>
        <span className="text-muted-foreground text-sm">
          Agent: <span className="font-medium text-foreground">ready</span>
        </span>
      </div>
      <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
        <p className="text-muted-foreground text-sm">Synthesizing interface…</p>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-24 w-full" />
      </div>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setDraft("");
        }}
      >
        <Input
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Describe the UI you want…"
          value={draft}
        />
        <Button disabled={!draft.trim()} type="submit">
          Send
        </Button>
        <Button type="button" variant="outline">
          Cancel
        </Button>
      </form>
    </div>
  );
}

/** Composition pattern: status + canvas + composer + actions in one shell. */
export const CanvasShell: Story = {
  render: () => <CanvasShellPreview />,
};
