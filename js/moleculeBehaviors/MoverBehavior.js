// ============================================================
// ASCII Chemistry — MoverBehavior.js
// ============================================================

import { MoleculeBehavior } from "./MoleculeBehavior.js";

export class MoverBehavior extends MoleculeBehavior {
  tick() {
    if (!this.game) return;

    const ratios = this.properties.ratios ?? {};
    const magnitudeRatio =
      (ratios.digitRatio ?? 0) > (ratios.vowelRatio ?? 0)
        ? (ratios.normalizedEntropy ?? 0)
        : (ratios.repetitionRatio ?? 0);

    if (magnitudeRatio <= 0) return;

    const angle = Math.PI * 2 * (ratios.asciiSumSinNormalized ?? 0);
    const force = magnitudeRatio * 0.1;
    const fx = Math.cos(angle) * force;
    const fy = Math.sin(angle) * force;

    const atoms = this.molecule.atoms;
    const n = atoms.length;
    if (n === 0) return;

    const span = ratios.asciiSumSinNormalized ?? 0;
    const motors = Math.max(
      1,
      Math.min(n - 1, Math.ceil(n * (ratios.repetitionRatio ?? 0) * 0.2))
    );
    const start = Math.floor(span * n) % n;

    for (let k = 0; k < motors; k++) {
      const i = (start + Math.floor((k * n) / motors)) % n;
      const m = atoms[i].mass;
      atoms[i].applyForce(fx * m, fy * m);
    }
  }
}
