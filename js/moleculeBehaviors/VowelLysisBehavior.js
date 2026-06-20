// ============================================================
// ASCII Chemistry — VowelLysisBehavior.js
// ============================================================

import { BOND_DISTANCE_FACTOR } from "../constants/chemistry.js";
import { distanceSquared } from "../utils.js";
import { MoleculeBehavior } from "./MoleculeBehavior.js";

export class VowelLysisBehavior extends MoleculeBehavior {
  tick() {
    if (!this.game) return;

    for (const atom of this.molecule.atoms) {
      for (const other of this.game._spatialHash.queryNeighbors(atom)) {
        if (other.molecule !== null) continue;
        if (!other.isVowel || other.isConnector) continue;

        const reach = (atom.radius + other.radius) * BOND_DISTANCE_FACTOR;
        const reachSq = reach * reach;
        if (distanceSquared(atom.x, atom.y, other.x, other.y) > reachSq) {
          continue;
        }

        this.molecule.dissolve();
        return;
      }
    }
  }
}
