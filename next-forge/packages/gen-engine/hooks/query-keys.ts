export const moleculeKeys = {
  all: ["molecules"] as const,
  catalog: () => [...moleculeKeys.all, "catalog"] as const,
  detail: (moleculeId: string) =>
    [...moleculeKeys.all, "detail", moleculeId] as const,
};
