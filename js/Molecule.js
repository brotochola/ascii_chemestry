// ============================================================
// ASCII Chemistry — Molecule.js
// ============================================================
import { calculateMoleculeProperties } from "./moleculePropertiesCalculator.js";
import { createBehaviorsForMolecule } from "./moleculeBehaviors/moleculeBehaviorFactory.js";
import { direction } from "./utils.js";

export class Molecule {
  static DISSOLVE_FORCE = 0.06;
  /**
   * @param {import('./Atom.js').Atom[]} atoms — átomos normales enlazados (componente conexo)
   * @param {import('./AsciiChemistry.js').AsciiChemistry} game
   */
  constructor(atoms, game) {
    this.id = game.nextId();
    this.atoms = atoms;
    this.properties = {};
    /** @type {string | null} */
    this._stringCache = null;
    /** @type {import('./moleculeBehaviors/MoleculeBehavior.js').MoleculeBehavior[]} */
    this.moleculeBehaviors = [];
    /** @type {import('./Protein.js').Protein | null} */
    this.protein = null;
    for (const atom of atoms) atom.molecule = this;
    this.recalculateProperties();
  }

  _invalidateString() {
    this._stringCache = null;
  }

  _applyColorToAtoms() {
    for (const atom of this.atoms) atom.updateVisual();
  }

  addAtom(atom) {
    if (this.atoms.includes(atom)) return;
    this.atoms.push(atom);
    atom.molecule = this;
    this._invalidateString();
    this.recalculateProperties();
  }

  merge(other) {
    for (const atom of other.atoms) {
      if (!this.atoms.includes(atom)) {
        this.atoms.push(atom);
        atom.molecule = this;
      }
    }
    this._invalidateString();
    this.recalculateProperties();
  }

  recalculateProperties() {
    const prevType = this.properties.moleculeType;
    this.properties = calculateMoleculeProperties(this.getString());
    const newType = this.properties.moleculeType;

    if (newType !== prevType) {
      this._rebuildBehaviors();
      this._applyColorToAtoms();
    }

    if (this.protein) {
      this.protein.recalculateProperties();
      this.protein.applyVisuals();
    }
  }

  _rebuildBehaviors() {
    this.moleculeBehaviors = createBehaviorsForMolecule(this);
  }

  tickBehaviors() {
    for (const behavior of this.moleculeBehaviors) {
      behavior.tick();
    }
  }

  dissolve() {
    const game = this.atoms[0]?.game;
    if (!game || !game.molecules.includes(this)) return;

    const cx = this.centerX;
    const cy = this.centerY;
    const atoms = [...this.atoms];
    const atomSet = new Set(atoms);
    const bonds = new Set();

    for (const atom of atoms) {
      for (const bond of atom.connections) {
        const other = bond.otherAtom(atom);
        const intra = atomSet.has(other);
        const connectorTouch = bond.isConnectorBond;
        if (intra || connectorTouch) bonds.add(bond);
      }
    }

    for (const bond of bonds) game._removeBond(bond);

    for (const atom of atoms) {
      const ax = atom.x;
      const ay = atom.y;
      const dir = direction(cx, cy, ax, ay);
      const force =
        atom.mass *
        this.properties.ratios.asciiSumSinNormalized *
        this.properties.ratios.isEvenCharCode *
        this.properties.ratios.lowercaseRatio *
        Molecule.DISSOLVE_FORCE;
      atom.applyForce(dir.x * force, dir.y * force);
      atom.molecule = null;
      atom.protein = null;
      atom.updateVisual();
    }

    this.moleculeBehaviors = [];
    this.protein = null;
    game.molecules = game.molecules.filter((m) => m !== this);
    game._sanitizeConnectorTopology();
    game._connectorTopologyDirty = true;
  }

  /** Enlaces activos a átomos conector (máx. 2 por molécula en una proteína) */
  getConnectorBondCount() {
    const seen = new Set();
    for (const atom of this.atoms) {
      for (const bond of atom.connections) {
        if (bond.otherAtom(atom).isConnector) seen.add(bond);
      }
    }
    return seen.size;
  }

  get centerX() {
    return (
      this.atoms.reduce((s, a) => s + a.x, 0) / this.atoms.length
    );
  }

  get centerY() {
    return (
      this.atoms.reduce((s, a) => s + a.y, 0) / this.atoms.length
    );
  }

  getString() {
    if (this._stringCache !== null) return this._stringCache;
    this._stringCache = this.atoms.map((a) => a.char).join("");
    return this._stringCache;
  }
}
