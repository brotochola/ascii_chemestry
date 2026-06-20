// ============================================================
// ASCII Chemistry — Bond.js
// ============================================================
import { Graphics } from "pixi.js";
import {
  BOND_STIFFNESS,
  BOND_DAMPING,
  CONNECTOR_LENGTH_FACTOR,
  CONNECTOR_STIFFNESS,
  CONNECTOR_MAX_CONNECTIONS,
} from "./constants/chemistry.js";
import { calcTransfer, canBondByPolarity } from "./polarity.js";
import {
  BOND_LINE_COLOR,
  BOND_LINE_WIDTH,
  BOND_LINE_ALPHA,
  colorFromProteinType,
} from "./constants/render.js";

/**
 * @param {import('./Atom.js').Atom} atomA
 * @param {import('./Atom.js').Atom} atomB
 * @param {boolean} isConnectorBond
 */
function validateBond(atomA, atomB, isConnectorBond) {
  if (!canBondByPolarity(atomA.remainingPolarity, atomB.remainingPolarity)) {
    throw new Error(
      `Polaridad incompatible entre '${atomA.char}' y '${atomB.char}'`,
    );
  }

  if (isConnectorBond) {
    const connector = atomA.isConnector ? atomA : atomB;
    const atom = atomA.isConnector ? atomB : atomA;

    if (!connector.isConnector || atom.isConnector) {
      throw new Error("Enlace conector requiere conector ↔ átomo en molécula");
    }
    if (connector.connections.size >= CONNECTOR_MAX_CONNECTIONS) {
      throw new Error(`Conector '${connector.char}' sin slots libres`);
    }
    if (atom.connectorBondCount() >= 1) {
      throw new Error(
        `Átomo '${atom.char}' ya tiene un enlace con un conector`,
      );
    }
    if (atom.molecule === null) {
      throw new Error("Solo átomos en molécula enlazan con conectores");
    }
    if (atom.molecule.getConnectorBondCount() >= 2) {
      throw new Error("La molécula ya tiene 2 enlaces con conectores");
    }
    for (const bond of connector.connections) {
      const linked = bond.otherAtom(connector);
      if (!linked.isConnector && linked.molecule === atom.molecule) {
        throw new Error(
          "Un conector no puede enlazar dos átomos de la misma molécula",
        );
      }
    }
    return;
  }

  if (atomA.isConnector || atomB.isConnector) {
    throw new Error("Enlaces moleculares no pueden incluir conectores");
  }
}

export class Bond {
  /**
   * @param {object} opts
   * @param {import('./Atom.js').Atom} opts.atomA
   * @param {import('./Atom.js').Atom} opts.atomB
   * @param {import('./AsciiChemistry.js').AsciiChemistry} opts.game
   * @param {boolean} [opts.isConnectorBond]
   */
  constructor({ atomA, atomB, game, isConnectorBond = false }) {
    this.atomA = atomA;
    this.atomB = atomB;
    this.game = game;
    this.isConnectorBond = isConnectorBond;

    validateBond(atomA, atomB, isConnectorBond);

    this.polarityTransfer = calcTransfer(
      atomA.remainingPolarity,
      atomB.remainingPolarity,
    );
    if (isConnectorBond) {
      const moleculeAtom = atomA.isConnector ? atomB : atomA;
      moleculeAtom.consumePolarityAmount(this.polarityTransfer);
    } else {
      atomA.consumePolarityAmount(this.polarityTransfer);
      atomB.consumePolarityAmount(this.polarityTransfer);
    }

    const lengthFactor = isConnectorBond ? CONNECTOR_LENGTH_FACTOR : 1;
    const stiffness = isConnectorBond ? CONNECTOR_STIFFNESS : BOND_STIFFNESS;
    const restLength = (atomA.radius + atomB.radius) * lengthFactor;

    this.restLength = restLength;
    this.stiffness = stiffness;

    this.physicsBondIndex = game.physics.addBond(
      atomA.physicsIndex,
      atomB.physicsIndex,
      restLength,
      stiffness,
      BOND_DAMPING,
    );

    atomA.addConnection(this);
    atomB.addConnection(this);

    this.graphics = new Graphics();
    game.bondsLayer.addChild(this.graphics);
    this._lastX1 = NaN;
    this._lastY1 = NaN;
    this._lastX2 = NaN;
    this._lastY2 = NaN;
    this._styleDirty = true;
  }

  otherAtom(atom) {
    return atom === this.atomA ? this.atomB : this.atomA;
  }

  _getProtein() {
    return (
      this.atomA.molecule?.protein ??
      this.atomB.molecule?.protein ??
      this.atomA.protein ??
      this.atomB.protein ??
      null
    );
  }

  _getLineColor() {
    const protein = this._getProtein();
    if (protein) {
      return colorFromProteinType(protein.properties.proteinType);
    }
    return BOND_LINE_COLOR;
  }

  syncVisual() {
    const x1 = this.atomA.x;
    const y1 = this.atomA.y;
    const x2 = this.atomB.x;
    const y2 = this.atomB.y;

    if (
      !this._styleDirty &&
      x1 === this._lastX1 &&
      y1 === this._lastY1 &&
      x2 === this._lastX2 &&
      y2 === this._lastY2
    ) {
      return;
    }

    this._lastX1 = x1;
    this._lastY1 = y1;
    this._lastX2 = x2;
    this._lastY2 = y2;
    this._styleDirty = false;

    this.graphics.clear();
    this.graphics.moveTo(x1, y1);
    this.graphics.lineTo(x2, y2);
    this.graphics.stroke({
      color: this._getLineColor(),
      width: BOND_LINE_WIDTH,
      alpha: BOND_LINE_ALPHA,
    });
  }

  markStyleDirty() {
    this._styleDirty = true;
  }

  dissolve() {
    if (this.isConnectorBond) {
      const moleculeAtom = this.atomA.isConnector ? this.atomB : this.atomA;
      moleculeAtom.restorePolarityAmount(this.polarityTransfer);
    } else {
      this.atomA.restorePolarityAmount(this.polarityTransfer);
      this.atomB.restorePolarityAmount(this.polarityTransfer);
    }
    this.atomA.removeConnection(this);
    this.atomB.removeConnection(this);
    this.graphics.removeFromParent();
    this.graphics.destroy();
  }
}
