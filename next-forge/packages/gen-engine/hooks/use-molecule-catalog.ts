"use client";

import { queryOptions, useQuery } from "@tanstack/react-query";
import type { MoleculeCatalog, MoleculeRecord } from "../catalog/types";
import { moleculeKeys } from "./query-keys";

export { moleculeKeys } from "./query-keys";

export interface MoleculeCatalogClient {
  getCatalog(): Promise<MoleculeCatalog>;
  getMolecule(moleculeId: string): Promise<MoleculeRecord>;
}

export function createMoleculeCatalogQueryOptions(
  client: MoleculeCatalogClient
) {
  return queryOptions({
    queryKey: moleculeKeys.catalog(),
    queryFn: () => client.getCatalog(),
    staleTime: 1000 * 60 * 5,
  });
}

export function createMoleculeQueryOptions(
  client: MoleculeCatalogClient,
  moleculeId: string
) {
  return queryOptions({
    queryKey: moleculeKeys.detail(moleculeId),
    queryFn: () => client.getMolecule(moleculeId),
    enabled: Boolean(moleculeId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useMoleculeCatalog(client: MoleculeCatalogClient) {
  return useQuery(createMoleculeCatalogQueryOptions(client));
}

export function useMolecule(client: MoleculeCatalogClient, moleculeId: string) {
  return useQuery(createMoleculeQueryOptions(client, moleculeId));
}
