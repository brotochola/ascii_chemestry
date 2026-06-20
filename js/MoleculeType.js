// ============================================================
// ASCII Chemistry — MoleculeType.js
// ============================================================
import { getOverallValue } from "./stringProperties.js";

export const MOLECULE_TYPE_COUNT = 10;

export const MOLECULE_TYPE_LABELS = [
  "inert",
  "stable",
  "mild",
  "reactive",
  "volatile",
  "complex",
  "ordered",
  "symmetric",
  "dense",
  "extreme",
];

/**
 * @param {{ metrics: object, ratios: object, booleans: object }} propertiesObject
 * @returns {number} 0..9
 */
export function classifyMoleculeType(propertiesObject) {
  const value = getOverallValue(propertiesObject);
  return Math.min(
    MOLECULE_TYPE_COUNT - 1,
    Math.floor(value * MOLECULE_TYPE_COUNT),
  );
}

window.classifyMoleculeType = classifyMoleculeType;
