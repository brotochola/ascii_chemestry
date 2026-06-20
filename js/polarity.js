// ============================================================
// ASCII Chemistry — polarity.js
// ============================================================

import {
  POLARITY_EPS,
  MIN_BOND_TRANSFER,
  POLARITY_FORCE_STRENGTH,
} from "./constants/chemistry.js";

/**
 * Magnitud de polaridad intercambiada al enlazar (signos opuestos).
 * @param {number} remA
 * @param {number} remB
 * @returns {number}
 */
export function calcTransfer(remA, remB) {
  if (remA * remB >= 0) return 0;
  return Math.min(Math.abs(remA), Math.abs(remB));
}

/**
 * @param {number} remA
 * @param {number} remB
 * @returns {boolean}
 */
export function canBondByPolarity(remA, remB) {
  return calcTransfer(remA, remB) >= MIN_BOND_TRANSFER;
}

/**
 * Fuerza sobre A debido a B (dx, dy = B - A).
 * @param {number} remA
 * @param {number} remB
 * @param {number} dx
 * @param {number} dy
 * @param {number} minDist
 * @returns {{ fx: number, fy: number }}
 */
export function polarityForceOnA(remA, remB, dx, dy, minDist) {
  if (Math.abs(remA) < POLARITY_EPS || Math.abs(remB) < POLARITY_EPS) {
    return { fx: 0, fy: 0 };
  }
  const distSq = Math.max(dx * dx + dy * dy, minDist * minDist);
  const scalar = (-POLARITY_FORCE_STRENGTH * remA * remB) / distSq;
  const invDist = 1 / Math.sqrt(distSq);
  return { fx: scalar * dx * invDist, fy: scalar * dy * invDist };
}

/**
 * @param {number} remaining
 * @param {number} transfer
 * @returns {number}
 */
export function consumePolarity(remaining, transfer) {
  if (transfer <= 0) return remaining;
  const sign = Math.sign(remaining) || 1;
  const next = remaining - sign * transfer;
  if (Math.sign(next) !== sign && next !== 0) return 0;
  return next;
}

/**
 * @param {number} remaining
 * @param {number} transfer
 * @param {number} basePolarity — tope al restaurar
 * @returns {number}
 */
export function restorePolarity(remaining, transfer, basePolarity) {
  if (transfer <= 0) return remaining;
  const sign = Math.sign(basePolarity) || Math.sign(remaining) || 1;
  const cap = Math.abs(basePolarity);
  const next = remaining + sign * transfer;
  return Math.sign(next) === sign || next === 0
    ? Math.max(-cap, Math.min(cap, next))
    : remaining;
}

/**
 * Suma de polaridad ya comprometida en enlaces activos.
 * @param {import('./Atom.js').Atom} atom
 * @returns {number}
 */
export function committedPolarity(atom) {
  let sum = 0;
  for (const bond of atom.connections) {
    sum += bond.polarityTransfer ?? 0;
  }
  return sum;
}
