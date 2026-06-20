// ============================================================
// ASCII Chemistry — tests.js
// Utilidades de prueba expuestas en window
// ============================================================
import { Atom } from "./Atom.js";
import { Bond } from "./Bond.js";
import { Molecule } from "./Molecule.js";
import { Protein } from "./Protein.js";

const ATOM_SPACING = 45;
const CHAIN_ROW_SPACING = 80;

/**
 * @param {string} str
 * @returns {Array<{ kind: 'mol', text: string } | { kind: 'sep', connector: string | null }>}
 */
function tokenizeProteinString(str) {
  const tokens = [];
  let buf = "";

  const pushMol = () => {
    if (buf) {
      tokens.push({ kind: "mol", text: buf });
      buf = "";
    }
  };

  for (const ch of str) {
    if (ch === " " || Atom.CONNECTOR_CHARS.includes(ch)) {
      pushMol();
      tokens.push({ kind: "sep", connector: ch === " " ? null : ch });
    } else {
      buf += ch;
    }
  }
  pushMol();

  return tokens;
}

/**
 * @param {ReturnType<typeof tokenizeProteinString>} tokens
 * @returns {{ moleculeStrings: string[], connectorChars: (string | null)[] }}
 */
function parseTokens(tokens) {
  const moleculeStrings = [];
  const connectorChars = [];

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.kind === "mol") {
      moleculeStrings.push(t.text);
    } else if (t.kind === "sep" && moleculeStrings.length > 0) {
      const hasNextMol = tokens.slice(i + 1).some((x) => x.kind === "mol");
      if (hasNextMol) connectorChars.push(t.connector);
    }
  }

  return { moleculeStrings, connectorChars };
}

/**
 * @param {string} text
 * @param {import('./AsciiChemistry.js').AsciiChemistry} game
 * @param {number} x
 * @param {number} y
 * @returns {import('./Molecule.js').Molecule}
 */
function createMoleculeFromString(text, game, x, y) {
  const atoms = text
    .split("")
    .map((ch, i) => game.spawnAtom(ch, x + i * ATOM_SPACING, y));

  for (let i = 0; i < atoms.length - 1; i++) {
    const bond = new Bond({ atomA: atoms[i], atomB: atoms[i + 1], game });
    game.bonds.push(bond);
  }

  const mol = new Molecule(atoms, game);
  game.molecules.push(mol);
  return mol;
}

/**
 * @param {string | null} char
 * @param {import('./Molecule.js').Molecule} molA
 * @param {import('./Molecule.js').Molecule} molB
 * @param {import('./AsciiChemistry.js').AsciiChemistry} game
 * @returns {import('./Atom.js').Atom | null}
 */
function linkMolecules(char, molA, molB, game) {
  if (!char) return null;

  const left = molA.atoms[molA.atoms.length - 1];
  const right = molB.atoms[0];
  const midX = (left.x + right.x) / 2;
  const midY = (left.y + right.y) / 2;

  const connector = game.spawnAtom(char, midX, midY);

  for (const atom of [left, right]) {
    const bond = new Bond({
      atomA: connector,
      atomB: atom,
      game,
      isConnectorBond: true,
    });
    game.bonds.push(bond);
  }

  return connector;
}

/**
 * Parsea un string en moléculas unidas por conectores (o espacios como separador)
 * y devuelve una Protein.
 *
 * Ejemplos:
 *   "abc-def"     → moléculas ["abc","def"], conector "-"
 *   "abc def"     → moléculas ["abc","def"], sin átomo conector entre ellas
 *   "a-b c"       → tres moléculas: "a" - "b" (espacio) "c"
 *
 * @param {string} str
 * @param {import('./AsciiChemistry.js').AsciiChemistry} [game]
 * @returns {import('./Protein.js').Protein}
 */
export function proteinFromString(str, game = window.juego) {
  if (!game) {
    throw new Error("AsciiChemistry no inicializado (window.juego)");
  }

  const { moleculeStrings, connectorChars } = parseTokens(
    tokenizeProteinString(str),
  );

  if (moleculeStrings.length === 0) {
    const protein = new Protein([], [], game);
    game.proteins.push(protein);
    return protein;
  }

  const orderedMolecules = moleculeStrings.map((text, i) =>
    createMoleculeFromString(text, game, 100, 100 + i * CHAIN_ROW_SPACING),
  );

  const connectors = [];
  for (let i = 0; i < orderedMolecules.length - 1; i++) {
    const connChar = connectorChars[i] ?? null;
    connectors.push(
      linkMolecules(
        connChar,
        orderedMolecules[i],
        orderedMolecules[i + 1],
        game,
      ),
    );
  }

  const protein = new Protein(orderedMolecules, connectors, game);
  for (const mol of orderedMolecules) mol.protein = protein;
  for (const conn of connectors) {
    if (conn) conn.protein = protein;
  }
  protein.applyVisuals();
  game.proteins.push(protein);

  return protein;
}

window.proteinFromString = proteinFromString;
