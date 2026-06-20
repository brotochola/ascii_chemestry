// ============================================================
// ASCII Chemistry — Atom.js
// ============================================================
import { Container, Graphics, Text } from "pixi.js";
import {
  ATOM_SIZE_MULTIPLIER,
  calcPolarityFromAscii,
  POLARITY_CONTROL_MAX,
  POLARITY_EPS,
  CONNECTOR_MAX_CONNECTIONS,
} from "./constants/chemistry.js";
import {
  ATOM_FILL_NORMAL,
  ATOM_FILL_CONNECTOR,
  ATOM_FILL_ALPHA,
  ATOM_STROKE_WIDTH,
  ATOM_STROKE_ALPHA,
  PROTEIN_STROKE_WIDTH,
  PROTEIN_STROKE_ALPHA,
  POLARITY_TEXT_FILL,
  POLARITY_TEXT_ALPHA,
  colorFromMoleculeType,
  colorFromProteinType,
} from "./constants/render.js";
import { consumePolarity, restorePolarity } from "./polarity.js";
import { getAtomCharFlags } from "./atomCharProperties.js";

export class Atom {
  static COMMON_CHARS =
    "abcdefghijklmnopqrstuvwxyz" + "ABCDEFGHIJKLMNOPQRSTUVWXYZ" + "0123456789";

  static CONNECTOR_CHARS = "!@#$%^&*=|;:,.-_";

  static CHARS = Atom.COMMON_CHARS + Atom.CONNECTOR_CHARS;

  static CHAR_SET = new Set(Atom.CHARS);

  static CONNECTOR_SET = new Set(Atom.CONNECTOR_CHARS);

  static EXTRACTABLE_CHARS_SORTED = [...Atom.COMMON_CHARS]
    .filter((ch) => ch.charCodeAt(0) > POLARITY_CONTROL_MAX)
    .sort((a, b) => a.charCodeAt(0) - b.charCodeAt(0));

  static LADDER_BELOW_CODE = (() => {
    const ladders = Array.from({ length: 128 }, () => []);
    const sorted = Atom.EXTRACTABLE_CHARS_SORTED;
    let i = 0;
    for (let code = 0; code < 128; code++) {
      while (i < sorted.length && sorted[i].charCodeAt(0) < code) i++;
      ladders[code] = sorted.slice(0, i);
    }
    return ladders;
  })();

  static isValidChar(char) {
    return char.length === 1 && char !== " " && Atom.CHAR_SET.has(char);
  }

  static randomChar() {
    return Atom.CHARS[Math.floor(Math.random() * Atom.CHARS.length)];
  }

  /**
   * @param {object} opts
   * @param {number} opts.x
   * @param {number} opts.y
   * @param {import('./AsciiChemistry.js').AsciiChemistry} opts.game
   */
  static createRandom({ x, y, game }) {
    return new Atom({ char: Atom.randomChar(), x, y, game });
  }

  /**
   * @param {object} opts
   * @param {string} opts.char
   * @param {number} opts.x
   * @param {number} opts.y
   * @param {import('./AsciiChemistry.js').AsciiChemistry} opts.game
   */
  constructor({ char, x, y, game }) {
    if (!Atom.isValidChar(char)) {
      throw new Error(
        `Carácter inválido para átomo: '${char}' (ASCII ${char.charCodeAt(0)})`,
      );
    }
    this.game = game;
    this.id = game.nextId();
    /** @type {number} */
    this.arrayIndex = -1;
    this.char = char;
    this.asciiValue = char.charCodeAt(0);
    this.isConnector = Atom.CONNECTOR_SET.has(char);
    this._syncCharFlags();
    /** @type {import('./Molecule.js').Molecule | null} */
    this.molecule = null;
    /** @type {import('./Protein.js').Protein | null} — conectores en una proteína */
    this.protein = null;
    this._connections = new Set();
    /** @type {Set<Atom>} */
    this._bondedNeighbors = new Set();
    this._polarityDirty = true;
    this._basePolarity = calcPolarityFromAscii(
      this.asciiValue,
      this.isConnector,
    );
    this._remainingPolarity = this._basePolarity;
    this.radius = this._calcRadius();
    this.mass = this._calcMass();
    /** @type {number} */
    this.physicsIndex = -1;
    this._spawnX = x;
    this._spawnY = y;

    this.container = new Container();
    this._visualContainer = new Container();
    this.container.addChild(this._visualContainer);
    this._buildVisual();
    this.updateVisual();
  }

  get x() {
    return this.game.physics.posX[this.physicsIndex];
  }

  get y() {
    return this.game.physics.posY[this.physicsIndex];
  }

  get vx() {
    return this.game.physics.velX[this.physicsIndex];
  }

  get vy() {
    return this.game.physics.velY[this.physicsIndex];
  }

  /** Superficie del círculo en px² (= valor ASCII) */
  get surface() {
    return this.asciiValue * ATOM_SIZE_MULTIPLIER;
  }

  get basePolarity() {
    return this._basePolarity;
  }

  get remainingPolarity() {
    return this._remainingPolarity;
  }

  get hasActivePolarity() {
    return Math.abs(this._remainingPolarity) > POLARITY_EPS;
  }

  get canAttemptMolecularBond() {
    return this.hasActivePolarity && !this.isConnector;
  }

  get canAttemptConnectorBond() {
    return (
      this.isConnector && this._connections.size < CONNECTOR_MAX_CONNECTIONS
    );
  }

  /** @param {number} transfer */
  consumePolarityAmount(transfer) {
    if (transfer <= 0) return;
    this._remainingPolarity = consumePolarity(
      this._remainingPolarity,
      transfer,
    );
    this._polarityDirty = true;
  }

  /** @param {number} transfer */
  restorePolarityAmount(transfer) {
    if (transfer <= 0) return;
    this._remainingPolarity = restorePolarity(
      this._remainingPolarity,
      transfer,
      this._basePolarity,
    );
    this._polarityDirty = true;
  }

  get connections() {
    return this._connections;
  }

  get isInMolecule() {
    return this.molecule !== null;
  }

  addConnection(bond) {
    if (
      this.isConnector &&
      this._connections.size >= CONNECTOR_MAX_CONNECTIONS
    ) {
      throw new Error(
        `Conector '${this.char}' ya tiene ${CONNECTOR_MAX_CONNECTIONS} conexiones`,
      );
    }
    this._connections.add(bond);
    this._bondedNeighbors.add(bond.otherAtom(this));
    this._polarityDirty = true;
  }

  removeConnection(bond) {
    this._bondedNeighbors.delete(bond.otherAtom(this));
    this._connections.delete(bond);
    this._polarityDirty = true;
  }

  /** @param {import('./Bond.js').Bond} bond */
  removeBond(bond) {
    if (!this._connections.has(bond)) return;
    this.game._removeBond(bond);
  }

  removeAllBonds() {
    for (const bond of [...this._connections]) {
      this.removeBond(bond);
    }
  }

  setChar(char) {
    if (!Atom.isValidChar(char)) {
      throw new Error(`Carácter inválido para átomo: '${char}'`);
    }

    const oldRadius = this.radius;
    this.char = char;
    this.asciiValue = char.charCodeAt(0);
    this.isConnector = Atom.CONNECTOR_SET.has(char);
    this._syncCharFlags();
    this._basePolarity = calcPolarityFromAscii(
      this.asciiValue,
      this.isConnector,
    );
    this._remainingPolarity = [...this._connections].reduce((rem, bond) => {
      if (this.isConnector && bond.isConnectorBond) return rem;
      return consumePolarity(rem, bond.polarityTransfer ?? 0);
    }, this._basePolarity);
    this.radius = this._calcRadius();
    this.mass = this._calcMass();
    this._polarityDirty = true;

    if (this.physicsIndex >= 0) {
      if (oldRadius > 0 && this.radius !== oldRadius) {
        this.game.physics.setBodyRadius(this.physicsIndex, this.radius);
      }
      this.game.physics.setBodyMass(this.physicsIndex, this.mass);
    }

    if (this._label) {
      this._label.text = this.char;
      this._label.style.fontSize = Math.max(10, this.radius * 1.1);
    }
    if (this._polarityText) {
      this._polarityText.style.fontSize = Math.max(8, this.radius * 0.42);
      this._layoutTextStack();
    }
    this.molecule?._invalidateString();
    this.updateVisual();
  }

  /**
   * @param {number} n — 1 = lowest extractable char below this atom
   * @returns {import('./Atom.js').Atom | null} spawned free atom, or null if n is out of range
   */
  divide(n) {
    const ladder = Atom.LADDER_BELOW_CODE[this.asciiValue];
    if (!ladder || n < 1 || n > ladder.length) return null;

    const ejectedChar = ladder[n - 1];
    const spawned = this.game.spawnAtom(ejectedChar, this.x, this.y);
    this.setChar(ejectedChar);
    return spawned;
  }

  /** @param {number} fx @param {number} fy */
  applyForce(fx, fy) {
    if (this.physicsIndex < 0) return;
    this.game.physics.applyForce(this.physicsIndex, fx, fy);
  }

  isBondedTo(other) {
    return this._bondedNeighbors.has(other);
  }

  /** Bonds cuyo otro extremo es un conector */
  connectorBondCount() {
    let count = 0;
    for (const bond of this._connections) {
      if (bond.otherAtom(this).isConnector) count++;
    }
    return count;
  }

  chemistryTick() {
    if (this.isConnector) {
      if (!this.canAttemptConnectorBond) return;
      for (const other of this.game._spatialHash.queryNeighbors(this)) {
        if (!other.isConnector) {
          this.game.tryCreateConnectorBond(this, other);
        }
      }
      return;
    }

    if (!this.canAttemptMolecularBond) return;

    for (const other of this.game._spatialHash.queryNeighbors(this)) {
      if (other.isConnector) {
        this.game.tryCreateConnectorBond(other, this);
      } else {
        this.game.tryCreateMoleculeBond(this, other);
      }
    }
  }

  _syncCharFlags() {
    const flags = getAtomCharFlags(this.char);
    this.isVowel = flags.isVowel;
    this.isConsonant = flags.isConsonant;
    this.isUpperCase = flags.isUpperCase;
    this.isLowerCase = flags.isLowerCase;
    this.isDigit = flags.isDigit;
    this.isSpecialChar = flags.isSpecialChar;
  }

  _calcRadius() {
    return Math.sqrt(this.surface / Math.PI);
  }

  _calcMass() {
    return this.surface;
  }

  _buildVisual() {
    this._circle = new Graphics();
    this._redrawCircle();

    this._textStack = new Container();

    const label = new Text({
      text: this.char,
      style: {
        fontFamily: "monospace",
        fontSize: Math.max(10, this.radius * 1.1),
        fill: 0xffffff,
        align: "center",
      },
    });
    label.anchor.set(0.5, 1);
    this._label = label;

    this._polarityText = new Text({
      text: "",
      style: {
        fontFamily: "monospace",
        fontSize: Math.max(8, this.radius * 0.42),
        fill: POLARITY_TEXT_FILL,
        align: "center",
      },
    });
    this._polarityText.anchor.set(0.5, 0);
    this._polarityText.alpha = POLARITY_TEXT_ALPHA;

    this._textStack.addChild(label);
    this._textStack.addChild(this._polarityText);
    this._layoutTextStack();

    this._visualContainer.addChild(this._circle);
    this.container.addChild(this._textStack);
  }

  _layoutTextStack() {
    const gap = Math.max(1, this.radius * 0.04);
    this._label.position.set(0, -gap / 2);
    this._polarityText.position.set(0, gap / 2);
  }

  _getProtein() {
    return this.molecule?.protein ?? this.protein ?? null;
  }

  _getFillColor() {
    if (this.molecule) {
      return colorFromMoleculeType(this.molecule.properties.moleculeType);
    }
    if (this.isConnector) {
      return ATOM_FILL_CONNECTOR;
    }
    return ATOM_FILL_NORMAL;
  }

  _getStrokeColor() {
    const protein = this._getProtein();
    if (protein) {
      return colorFromProteinType(protein.properties.proteinType);
    }
    return 0xffffff;
  }

  _redrawCircle() {
    const protein = this._getProtein();
    this._circle.clear();
    this._circle.circle(0, 0, this.radius);
    this._circle.fill({ color: this._getFillColor(), alpha: ATOM_FILL_ALPHA });
    this._circle.stroke({
      color: this._getStrokeColor(),
      width: protein ? PROTEIN_STROKE_WIDTH : ATOM_STROKE_WIDTH,
      alpha: protein ? PROTEIN_STROKE_ALPHA : ATOM_STROKE_ALPHA,
    });
  }

  updateVisual() {
    this._visualContainer.tint = 0xffffff;
    this._redrawCircle();
    this._polarityDirty = true;
    if (this._polarityText) {
      this._drawPolarityIndicator();
      this._polarityDirty = false;
    }
  }

  syncVisual() {
    this.container.position.set(this.x, this.y);
    if (this._polarityDirty) {
      this._drawPolarityIndicator();
      this._polarityDirty = false;
    }
  }

  _formatRemainingPolarity() {
    const v = this._remainingPolarity;
    if (Math.abs(v) < POLARITY_EPS) return "0";
    const sign = v > 0 ? "+" : "";
    return sign + v.toFixed(2);
  }

  _drawPolarityIndicator() {
    this._polarityText.text = this._formatRemainingPolarity();
    this._polarityText.visible = true;
  }
}
