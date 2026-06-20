// ============================================================
// ASCII Chemistry — bondStrength.js
// Ruptura de enlaces por estiramiento vs polarityTransfer
// ============================================================

import { MIN_BOND_TRANSFER, BOND_BREAK_FRAGILITY } from "./constants/chemistry.js";

/**
 * Ratio dist/restLength máximo. 1.0 = distancia de reposo (suma de radios).
 * @param {number} polarityTransfer
 * @returns {number}
 */
export function maxStretchRatio(polarityTransfer) {
  const strength = Math.max(polarityTransfer, MIN_BOND_TRANSFER);
  const fragility = Math.max(BOND_BREAK_FRAGILITY, 1e-6);
  return 1 + strength / fragility;
}

/**
 * @param {number} dist
 * @param {number} restLength
 * @param {number} polarityTransfer
 * @returns {boolean}
 */
export function isBondOverstretched(dist, restLength, polarityTransfer) {
  if (restLength <= 0) return true;
  const overstretch = dist / restLength - 1;
  if (overstretch <= 0) return false;
  const strength = Math.max(polarityTransfer, MIN_BOND_TRANSFER);
  return overstretch * BOND_BREAK_FRAGILITY > strength;
}

/**
 * @param {import('./Bond.js').Bond} bond
 * @returns {boolean}
 */
export function shouldBreakBond(bond) {
  const ax = bond.atomA.x;
  const ay = bond.atomA.y;
  const bx = bond.atomB.x;
  const by = bond.atomB.y;
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return isBondOverstretched(dist, bond.restLength, bond.polarityTransfer);
}
