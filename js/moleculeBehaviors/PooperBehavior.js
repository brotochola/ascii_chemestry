// ============================================================
// ASCII Chemistry — PooperBehavior.js
// ============================================================
import { direction } from "../utils.js";
import { POLARITY_EPS } from "../constants/chemistry.js";
import { committedPolarity } from "../polarity.js";
import { MoleculeBehavior } from "./MoleculeBehavior.js";

export class PooperBehavior extends MoleculeBehavior {
  static EJECT_FORCE_MIN = 5;
  static EJECT_FORCE_MAX = 25;

  /** @param {Record<string, number>} ratios */
  _ejectForce(ratios) {
    const primary =
      (ratios.digitRatio ?? 0) > (ratios.vowelRatio ?? 0)
        ? (ratios.normalizedEntropy ?? 0)
        : (ratios.repetitionRatio ?? 0);
    const secondary = ratios.asciiSumSinNormalized ?? 0;
    const t = primary * 0.7 + secondary * 0.3;
    return (
      PooperBehavior.EJECT_FORCE_MIN +
      t * (PooperBehavior.EJECT_FORCE_MAX - PooperBehavior.EJECT_FORCE_MIN)
    );
  }

  tick() {
    if (!this.game) return;

    const ratios = this.properties.ratios ?? {};
    if (
      ((ratios.consonantRatio ?? 0) + (ratios.repetitionRatio ?? 0)) % 1 >=
      (ratios.uniqueCharRatio ?? 0)
    ) {
      return;
    }

    const n = Math.max(
      1,
      Math.floor((ratios.digitRatio ?? 0) * 15) +
        Math.floor((ratios.specialCharRatio ?? 0) * 10),
    );

    const lastAtom = this.molecule.atoms.at(-1);
    if (!lastAtom) return;

    const spawned = lastAtom.divide(n);
    if (!spawned) return;

    this._trimExcessBonds(lastAtom);

    const ax = lastAtom.x;
    const ay = lastAtom.y;
    const dir = direction(
      this.molecule.centerX,
      this.molecule.centerY,
      ax,
      ay,
    );

    const force = this._ejectForce(ratios);
    const m = spawned.mass;
    spawned.applyForce(dir.x * force * m, dir.y * force * m);

    this.molecule.recalculateProperties();
  }

  /** @param {import('../Atom.js').Atom} atom */
  _trimExcessBonds(atom) {
    const cap = Math.abs(atom.basePolarity) + POLARITY_EPS;
    while (committedPolarity(atom) > cap) {
      const bonds = [...atom.connections].sort((a, b) => {
        const aConn = a.isConnectorBond ? 1 : 0;
        const bConn = b.isConnectorBond ? 1 : 0;
        return aConn - bConn;
      });
      if (bonds.length === 0) break;
      atom.removeBond(bonds[0]);
    }
  }
}
