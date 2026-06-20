// ============================================================
// ASCII Chemistry — polarity.test.js
// Ejecutar: node js/polarity.test.js
// ============================================================

import {
  canBondByPolarity,
  polarityForceOnA,
  calcTransfer,
  committedPolarity,
} from "./polarity.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// --- mismo signo no enlaza ---
assert(
  canBondByPolarity(-0.5, -0.5) === false,
  "same negative polarity should not bond",
);
assert(
  canBondByPolarity(0.5, 0.5) === false,
  "same positive polarity should not bond",
);
assert(
  canBondByPolarity(0.5, -0.5) === true,
  "opposite polarity should bond",
);
assert(calcTransfer(-0.5, -0.5) === 0, "transfer same sign is 0");
console.log("canBondByPolarity OK");

// --- repulsión mismo signo ---
{
  const dx = 10;
  const dy = 0;
  const minDist = 8;
  const onA = polarityForceOnA(-0.5, -0.5, dx, dy, minDist);
  assert(onA.fx < 0, `repulsion on A expected fx < 0, got ${onA.fx}`);
  assert(Math.abs(onA.fy) < 1e-9, "repulsion on A expected fy ~ 0");

  const onB = polarityForceOnA(-0.5, -0.5, -dx, -dy, minDist);
  assert(onB.fx > 0, `repulsion on B expected fx > 0, got ${onB.fx}`);
  console.log("polarity repulsion OK");
}

// --- atracción signos opuestos ---
{
  const onA = polarityForceOnA(0.5, -0.5, 10, 0, 8);
  assert(onA.fx > 0, `attraction on A expected fx > 0, got ${onA.fx}`);
  console.log("polarity attraction OK");
}

// --- neutro no interactúa ---
{
  const onA = polarityForceOnA(0, -0.5, 10, 0, 8);
  assert(onA.fx === 0 && onA.fy === 0, "neutral atom should not feel force");
  console.log("neutral polarity OK");
}

// --- committedPolarity ---
{
  const atom = {
    basePolarity: 0.8,
    connections: new Set([
      { polarityTransfer: 0.3 },
      { polarityTransfer: 0.2 },
    ]),
  };
  assert(
    committedPolarity(atom) === 0.5,
    `committedPolarity expected 0.5, got ${committedPolarity(atom)}`,
  );
  console.log("committedPolarity OK");
}

console.log("All polarity tests passed.");
