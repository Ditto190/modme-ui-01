import { Skeleton } from "@repo/design-system/components/ui/skeleton";

export default function GenerativeUiLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-full max-w-md" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
