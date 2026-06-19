'use client';

interface AgentPanelSkeletonProps {
  label?: string;
}

/**
 * Glassmorphism loading shell shown while the agent panel is connecting or processing.
 */
export function AgentPanelSkeleton({
  label = 'Agent is thinking…',
}: AgentPanelSkeletonProps) {
  return (
    <div
      className="agent-glass-panel relative overflow-hidden rounded-2xl p-8"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="agent-glass-shimmer absolute inset-0 pointer-events-none" />
      <div className="relative space-y-4">
        <div className="h-3 w-32 rounded-full agent-glass-bar" />
        <div className="h-3 w-full rounded-full agent-glass-bar opacity-80" />
        <div className="h-3 w-5/6 rounded-full agent-glass-bar opacity-60" />
        <div className="h-3 w-2/3 rounded-full agent-glass-bar opacity-40" />
        <p className="pt-4 text-sm tracking-wide text-slate-300/90">{label}</p>
      </div>
    </div>
  );
}
