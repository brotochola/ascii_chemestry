// ============================================================
// ASCII Chemistry — moleculePropertiesCalculator.js
// ============================================================
import { calculateStringProperties } from "./stringProperties.js";
import { classifyMoleculeType } from "./MoleculeType.js";

/**
 * @param {string} str — molecule string from getString()
 * @returns {{ metrics: object, ratios: object, booleans: object, calculated: object, moleculeType: number }}
 */
export function calculateMoleculeProperties(str) {
  if (!str.length) {
    return {
      metrics: {},
      ratios: {},
      booleans: {},
      calculated: {},
      moleculeType: 0,
    };
  }

  const { metrics, ratios, booleans, calculated } =
    calculateStringProperties(str);
  const moleculeType = classifyMoleculeType({ metrics, ratios, booleans });

  return { metrics, ratios, booleans, calculated, moleculeType };
}
