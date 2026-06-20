"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { useEffect } from "react";

export default function GenerativeUiError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg space-y-4 p-6">
      <h2 className="font-semibold text-lg">Generative UI failed to load</h2>
      <p className="text-muted-foreground text-sm">{error.message}</p>
      <Button onClick={reset} type="button">
        Try again
      </Button>
    </div>
  );
}
