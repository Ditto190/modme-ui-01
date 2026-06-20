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
        <div className="size-3 rounded-full bg-emerald-400" />
        <span className="text-sm">Connected</span>
      </div>
      <span className="text-muted-foreground text-sm">
        Agent: <span className="font-medium text-foreground">ready</span>
      </span>
      <Badge variant="outline">Running tool…</Badge>
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
      Port patterns from GenerativeUI{" "}
      <code className="rounded bg-muted px-1">GenerativeCanvas</code> into
      client islands under{" "}
      <code className="rounded bg-muted px-1">apps/app</code>. See{" "}
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
          <div className="size-3 rounded-full bg-emerald-400" />
          <span className="text-sm">Connected</span>
        </div>
        <Badge variant="outline">Agent ready</Badge>
      </div>
      <div className="space-y-3 rounded-lg bg-muted/40 p-4">
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
          placeholder="Ask the agent…"
          value={draft}
        />
        <Button disabled={!draft.trim()} type="submit">
          Send
        </Button>
      </form>
      <div className="flex gap-2">
        <Button type="button" variant="default">
          Run agent
        </Button>
        <Button type="button" variant="outline">
          Reset canvas
        </Button>
      </div>
    </div>
  );
}

/** Composition pattern: status + canvas + composer + actions in one shell. */
export const CanvasShell: Story = {
  render: () => <CanvasShellPreview />,
};
