// ============================================================
// ASCII Chemistry — CalculatedLysisBehavior.js
// ============================================================

import { BOND_DISTANCE_FACTOR } from "../constants/chemistry.js";
import { distanceSquared } from "../utils.js";
import { MoleculeBehavior } from "./MoleculeBehavior.js";

const ATOM_CLASS_MATCHERS = [
  (a) => a.isDigit,
  (a) => a.isVowel,
  (a) => a.isConsonant,
  (a) => a.isUpperCase,
  (a) => a.isLowerCase,
  (a) => a.isSpecialChar,
];

export class CalculatedLysisBehavior extends MoleculeBehavior {
  tick() {
    if (!this.game) return;

    const phase = this.properties.calculated?.sinXorPlusSum ?? 0;
    const idx =
      Math.floor(phase * ATOM_CLASS_MATCHERS.length) %
      ATOM_CLASS_MATCHERS.length;
    const matches = ATOM_CLASS_MATCHERS[idx];

    for (const atom of this.molecule.atoms) {
      for (const other of this.game._spatialHash.queryNeighbors(atom)) {
        const victim = other.molecule;
        if (!victim || victim === this.molecule) continue;
        if (other.isConnector) continue;
        if (!matches(other)) continue;

        const reach = (atom.radius + other.radius) * BOND_DISTANCE_FACTOR;
        const reachSq = reach * reach;
        if (distanceSquared(atom.x, atom.y, other.x, other.y) > reachSq) {
          continue;
        }
        // console.log("dissolving", atom.char, other.char);
        victim.dissolve();
        return;
      }
    }
  }
}
