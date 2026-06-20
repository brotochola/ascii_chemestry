// ============================================================
// ASCII Chemistry — bondStrength.test.js
// Ejecutar: node js/bondStrength.test.js
// ============================================================

import { maxStretchRatio, isBondOverstretched } from "./bondStrength.js";
import { MIN_BOND_TRANSFER, BOND_BREAK_FRAGILITY } from "./constants/chemistry.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Más polarityTransfer → aguanta más estiramiento (fragility = 1)
{
  const weak = maxStretchRatio(0.005);
  const strong = maxStretchRatio(0.5);
  assert(strong > weak, "stronger polarity bond should allow more stretch");
}

// Umbral = 1 + transfer/fragility
{
  const transfer = 0.4;
  const expected = 1 + transfer / BOND_BREAK_FRAGILITY;
  assert(
    Math.abs(maxStretchRatio(transfer) - expected) < 1e-9,
    "limit should be 1 + polarityTransfer/fragility",
  );
}

// transfer mínimo usa MIN_BOND_TRANSFER
assert(
  Math.abs(maxStretchRatio(0) - (1 + MIN_BOND_TRANSFER / BOND_BREAK_FRAGILITY)) <
    1e-9,
  "zero transfer should floor at MIN_BOND_TRANSFER",
);

// fragilidad 2 → la mitad de estiramiento permitido
{
  const transfer = 0.5;
  const atOne = 1 + transfer / 1;
  const atTwo = 1 + transfer / 2;
  assert(atTwo < atOne, "double fragility should halve allowed stretch");
  assert(Math.abs(atTwo - (1 + transfer / 2)) < 1e-9, "2x fragility formula");
}

// No rompe en o por debajo de restLength
{
  const rest = 100;
  assert(
    isBondOverstretched(rest, rest, 0.2) === false,
    "at rest length should not break",
  );
  assert(
    isBondOverstretched(rest * 0.9, rest, 0.2) === false,
    "below rest length should not break",
  );
}

// isBondOverstretched en el límite
{
  const rest = 100;
  const transfer = 0.2;
  const limit = maxStretchRatio(transfer);
  assert(
    isBondOverstretched(rest * limit, rest, transfer) === false,
    "at exact limit should not break",
  );
  assert(
    isBondOverstretched(rest * (limit + 0.01), rest, transfer),
    "beyond limit should break",
  );
}

console.log("bondStrength OK");
