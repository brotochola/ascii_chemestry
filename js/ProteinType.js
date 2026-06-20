// ============================================================
// ASCII Chemistry — ProteinType.js
// ============================================================
import { getOverallValue } from "./stringProperties.js";

export const PROTEIN_TYPE_COUNT = 10;

export const PROTEIN_TYPE_LABELS = [
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

const TYPE_PROPERTY_INFLUENCE = [
  0.15, // inert
  0.25, // stable
  0.35, // mild
  0.5, // reactive
  0.6, // volatile
  0.75, // complex
  0.55, // ordered
  0.45, // symmetric
  0.65, // dense
  0.8, // extreme
];

const TYPE_DOMINANCE = 0.6;
const PROPERTY_SHARE = 0.4;

/** @param {number} index @param {number} count */
function positionWeight(index, count) {
  if (count <= 1) return 1;
  const phase = ((index + 1) * Math.PI) / (count + 1);
  return 0.6 + 0.4 * Math.sin(phase);
}

/** @param {import('./Molecule.js').Molecule} mol @param {number} index @param {number} count */
function moleculeSlotScore(mol, index, count) {
  const { moleculeType = 0 } = mol.properties;
  const typeNorm = moleculeType / (PROTEIN_TYPE_COUNT - 1);
  const propVal = getOverallValue(mol.properties);
  const propWeight = TYPE_PROPERTY_INFLUENCE[moleculeType] ?? 0.5;
  const pos = positionWeight(index, count);

  const core =
    TYPE_DOMINANCE * typeNorm + PROPERTY_SHARE * propVal * propWeight;

  return core * pos;
}

/**
 * @param {import('./Molecule.js').Molecule[]} orderedMolecules
 * @returns {number} 0..9
 */
export function classifyProteinType(orderedMolecules) {
  const mols = orderedMolecules ?? [];
  if (mols.length === 0) return 0;

  let sum = 0;
  for (let i = 0; i < mols.length; i++) {
    sum += moleculeSlotScore(mols[i], i, mols.length);
  }
  const avg = sum / mols.length;

  return Math.min(
    PROTEIN_TYPE_COUNT - 1,
    Math.floor(avg * PROTEIN_TYPE_COUNT),
  );
}

window.classifyProteinType = classifyProteinType;
