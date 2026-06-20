// ============================================================
// ASCII Chemistry — SeparationBehavior.js
// ============================================================
import {
  SEPARATION_STRENGTH,
  SEPARATION_RADIUS,
  SEPARATION_MIN_DIST,
} from "../constants/chemistry.js";
import { directionFromDelta } from "../utils.js";
import { MoleculeBehavior } from "./MoleculeBehavior.js";

const CALC_PHASE_KEYS = [
  "sinXorPlusSum",
  "cosXorPlusSum",
  "sin_sumStats",
  "cos_sumStats",
  "sin_sumStructural",
  "cos_sumStructural",
  "sin_sumCodes",
  "cos_sumCodes",
  "sin_entropy",
  "cos_entropy",
  "sin_xorFingerprint",
  "cos_xorFingerprint",
];

export class SeparationBehavior extends MoleculeBehavior {
  /** @param {string} key */
  _calc01(key) {
    return this.properties.calculated?.[key] ?? 0;
  }

  _calculatedBias() {
    const c = this.properties.calculated ?? {};
    return (
      (c.sin_sumCounts ?? 0) * 0.2 +
      (c.cos_sumStructural ?? 0) * 0.2 +
      (c.sin_sumCodes ?? 0) * 0.2 +
      (c.cos_sumStats ?? 0) * 0.2 +
      (c.sinXorPlusSum ?? 0) * 0.2
    );
  }

  /** @param {import('../Atom.js').Atom} atom @param {number} index */
  _isSeparator(atom, index) {
    const r = this.properties.ratios ?? {};
    const phaseKey = CALC_PHASE_KEYS[index % CALC_PHASE_KEYS.length];
    const phase =
      (this._calc01(phaseKey) * 0.6 + (r.asciiSumSinNormalized ?? 0) * 0.4) %
      1;

    const atomBias =
      (atom.isVowel ? (r.vowelRatio ?? 0) : 0) +
      (atom.isConsonant ? (r.consonantRatio ?? 0) : 0) +
      (atom.isDigit ? (r.digitRatio ?? 0) : 0) +
      ((atom.asciiValue % 97) / 97) * (r.uniqueCharRatio ?? 0);

    const normAtomBias = atomBias / 4;
    const calcBias = this._calculatedBias();
    const cutoff = 0.2 + (normAtomBias * 0.35 + calcBias * 0.45);
    return phase < cutoff;
  }

  /** @param {import('../Atom.js').Atom} atom @param {number} index */
  _strengthFor(atom, index) {
    const r = this.properties.ratios ?? {};
    const calcKey = CALC_PHASE_KEYS[(index + 3) % CALC_PHASE_KEYS.length];
    const molScale =
      0.35 +
      (r.normalizedEntropy ?? 0) * 0.25 +
      this._calc01(calcKey) * 0.25 +
      this._calculatedBias() * 0.15;
    const atomScale = 0.5 + (atom.asciiValue % 64) / 128;
    return SEPARATION_STRENGTH * molScale * atomScale;
  }

  tick() {
    if (!this.game) return;

    const minDistSq = SEPARATION_MIN_DIST * SEPARATION_MIN_DIST;

    for (let i = 0; i < this.molecule.atoms.length; i++) {
      const atom = this.molecule.atoms[i];
      if (!this._isSeparator(atom, i)) continue;

      const { x: ax, y: ay } = atom;
      const neighbors = this.game._spatialHash.queryRadiusFromBuckets(
        ax,
        ay,
        SEPARATION_RADIUS,
      );

      for (const other of neighbors) {
        if (other === atom) continue;
        if (other.molecule === this.molecule) continue;

        const { x: ox, y: oy } = other;
        const dx = ax - ox;
        const dy = ay - oy;
        const distSq = Math.max(dx * dx + dy * dy, minDistSq);
        const magnitude = this._strengthFor(atom, i) / distSq;
        const dir = directionFromDelta(dx, dy);
        const m = atom.mass;

        atom.applyForce(dir.x * magnitude * m, dir.y * magnitude * m);
      }
    }
  }
}
