// ============================================================
// ASCII Chemistry — proteinPropertiesCalculator.js
// ============================================================
import { calculateStringProperties } from "./stringProperties.js";
import { classifyProteinType } from "./ProteinType.js";

/**
 * @param {import('./Molecule.js').Molecule[]} orderedMolecules
 * @returns {{ metrics: object, ratios: object, booleans: object, calculated: object, proteinType: number }}
 */
export function calculateProteinProperties(orderedMolecules) {
  const mols = orderedMolecules ?? [];
  if (mols.length === 0) {
    return {
      metrics: {},
      ratios: {},
      booleans: {},
      calculated: {},
      proteinType: 0,
    };
  }

  const str = mols.map((m) => m.getString()).join("");
  const { metrics, ratios, booleans, calculated } =
    calculateStringProperties(str);
  const proteinType = classifyProteinType(mols);

  return { metrics, ratios, booleans, calculated, proteinType };
}
