// ============================================================
// ASCII Chemistry — MoleculeBehavior.js
// ============================================================

export class MoleculeBehavior {
  /** @param {import('../Molecule.js').Molecule} molecule */
  constructor(molecule) {
    this.molecule = molecule;
    /** @type {import('../AsciiChemistry.js').AsciiChemistry | null} */
    this.game = molecule.atoms[0]?.game ?? null;
  }

  get properties() {
    return this.molecule.properties;
  }

  /** Called once per chemistry tick. Override in subclasses. */
  tick() {}
}
