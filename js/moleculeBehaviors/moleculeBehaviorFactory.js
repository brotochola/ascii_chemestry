// ============================================================
// ASCII Chemistry — moleculeBehaviorFactory.js
// ============================================================
import { MoverBehavior } from "./MoverBehavior.js";
import { PooperBehavior } from "./PooperBehavior.js";
import { VowelLysisBehavior } from "./VowelLysisBehavior.js";
import { CalculatedLysisBehavior } from "./CalculatedLysisBehavior.js";
import { SeparationBehavior } from "./SeparationBehavior.js";

/** @type {Record<number, Array<new(molecule: import('../Molecule.js').Molecule) => import('./MoleculeBehavior.js').MoleculeBehavior>>} */
export const MOLECULE_TYPE_BEHAVIOR_CLASSES = {
  0: [], // inert
  1: [SeparationBehavior], // stable
  2: [SeparationBehavior], // mild
  3: [VowelLysisBehavior], // reactive
  4: [MoverBehavior, SeparationBehavior], // volatile
  5: [PooperBehavior], // complex
  6: [VowelLysisBehavior], // ordered
  7: [CalculatedLysisBehavior], // symmetric
  8: [MoverBehavior, SeparationBehavior], // dense
  9: [], // extreme
};

// export const MOLECULE_TYPE_BEHAVIOR_CLASSES = {
//   0: [], // inert
//   1: [], // stable
//   2: [], // mild
//   3: [], // reactive
//   4: [], // volatile
//   5: [], // complex
//   6: [], // ordered
//   7: [], // symmetric
//   8: [], // dense
//   9: [], // extreme
// };

/**
 * @param {import('../Molecule.js').Molecule} molecule
 * @returns {import('./MoleculeBehavior.js').MoleculeBehavior[]}
 */
export function createBehaviorsForMolecule(molecule) {
  const type = molecule.properties.moleculeType ?? 0;
  const classes = MOLECULE_TYPE_BEHAVIOR_CLASSES[type] ?? [];
  return classes.map((BehaviorClass) => new BehaviorClass(molecule));
}
