import type { MoleculeCatalog, MoleculeRecord } from "@repo/gen-engine";
import { parseMoleculeCatalog } from "@repo/gen-engine";
import { apiClient } from "@/shared/api-client";

export const moleculeCatalogClient = {
  async getCatalog(): Promise<MoleculeCatalog> {
    const raw = await apiClient.get<unknown>("/api/molecules/catalog");
    return parseMoleculeCatalog(raw);
  },
  async getMolecule(moleculeId: string): Promise<MoleculeRecord> {
    const catalog = await moleculeCatalogClient.getCatalog();
    const molecule = catalog.molecules.find((entry) => entry.id === moleculeId);
    if (!molecule) {
      throw new Error(`Molecule not found: ${moleculeId}`);
    }
    return molecule;
  },
};
