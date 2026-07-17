import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type MoleculeCatalog,
  type MoleculeRecord,
  parseMoleculeCatalog,
} from "./types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_CATALOG = resolve(
  __dirname,
  "../../../../data/molecule-index/catalog.v1.json"
);
const BUNDLED_CATALOG = resolve(__dirname, "./catalog.v1.json");

let cachedCatalog: MoleculeCatalog | null = null;

function readCatalogJson(): unknown {
  if (existsSync(REPO_CATALOG)) {
    return JSON.parse(readFileSync(REPO_CATALOG, "utf8"));
  }
  return JSON.parse(readFileSync(BUNDLED_CATALOG, "utf8"));
}

export function loadMoleculeCatalog(): MoleculeCatalog {
  if (!cachedCatalog) {
    cachedCatalog = parseMoleculeCatalog(readCatalogJson());
  }
  return cachedCatalog;
}

export function getMoleculeById(
  moleculeId: string
): MoleculeRecord | undefined {
  const catalog = loadMoleculeCatalog();
  return catalog.molecules.find((molecule) => molecule.id === moleculeId);
}

export function listMoleculesByTier(
  tier: MoleculeRecord["genUItier"]
): MoleculeRecord[] {
  const catalog = loadMoleculeCatalog();
  return catalog.molecules.filter((molecule) => molecule.genUItier === tier);
}

export function searchMolecules(
  query: string,
  routeHint?: MoleculeRecord["route_hint"]
): MoleculeRecord[] {
  const catalog = loadMoleculeCatalog();
  const normalized = query.trim().toLowerCase();

  return catalog.molecules.filter((molecule) => {
    if (routeHint && molecule.route_hint !== routeHint) {
      return false;
    }
    if (!normalized) {
      return true;
    }
    const haystack = [
      molecule.id,
      molecule.name,
      molecule.description,
      molecule.route_hint ?? "",
      ...molecule.tags,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalized);
  });
}
