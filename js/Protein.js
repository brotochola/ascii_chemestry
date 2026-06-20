// ============================================================
// ASCII Chemistry — Protein.js
// ============================================================
import { calculateProteinProperties } from "./proteinPropertiesCalculator.js";

export class Protein {
  /**
   * @param {import('./Molecule.js').Molecule[]} orderedMolecules — cadena extremo a extremo
   * @param {import('./Atom.js').Atom[]} connectors — connectors[i] une orderedMolecules[i] y [i+1]
   * @param {import('./AsciiChemistry.js').AsciiChemistry} game
   */
  constructor(orderedMolecules, connectors, game) {
    this.id = game.nextId();
    this.molecules = new Set(orderedMolecules);
    this.orderedMolecules = orderedMolecules;
    this.connectors = connectors;
    this.properties = {};
    this.recalculateProperties();
  }

  get length() {
    return this.molecules.size;
  }

  getString() {
    return this.orderedMolecules
      .map((mol, i) => {
        const s = mol.getString();
        const conn = this.connectors[i];
        return conn ? s + conn.char : s;
      })
      .join("");
  }

  recalculateProperties() {
    this.properties = calculateProteinProperties(this.orderedMolecules);
  }

  applyVisuals() {
    for (const mol of this.orderedMolecules) {
      for (const atom of mol.atoms) atom.updateVisual();
    }
    for (const conn of this.connectors) {
      if (conn) conn.updateVisual();
    }
  }
}
