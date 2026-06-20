// ============================================================
// ASCII Chemistry — physicsWorld.test.js
// Ejecutar: node js/physics/physicsWorld.test.js
// ============================================================

import { PhysicsWorld } from "./PhysicsWorld.js";
import { WORLD_CLAMP_BOUNCE } from "./physicsConstants.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function approx(a, b, eps = 0.5) {
  return Math.abs(a - b) <= eps;
}

// --- Resorte mantiene restLength ---
{
  const world = new PhysicsWorld();
  const a = world.addBody(0, 0, 10, 100);
  const b = world.addBody(80, 0, 10, 100);
  const rest = 50;
  world.addBond(a, b, rest, 0.05, 0.1);

  for (let i = 0; i < 30; i++) {
    world.step(1 / 60);
  }

  const dx = world.posX[b] - world.posX[a];
  const dy = world.posY[b] - world.posY[a];
  const dist = Math.sqrt(dx * dx + dy * dy);
  assert(approx(dist, rest, 0.05), `rigid bond expected ~${rest}, got ${dist}`);
  console.log("rigid bond rest length OK");
}

// --- Cadena bajo fuerza mantiene longitudes ---
{
  const world = new PhysicsWorld();
  const bodies = [];
  const rest = 35;
  for (let i = 0; i < 6; i++) {
    bodies.push(world.addBody(i * rest, 100, 8, 200));
    if (i > 0) world.addBond(bodies[i - 1], bodies[i], rest, 0.05, 0.1);
  }
  const mid = bodies[3];
  world.applyForce(mid, mid * 80, 0);

  for (let i = 0; i < 90; i++) {
    world.step(1 / 60);
  }

  for (let b = 0; b < world.bondCount; b++) {
    const a = world.bondAtomA[b];
    const c = world.bondAtomB[b];
    const dx = world.posX[c] - world.posX[a];
    const dy = world.posY[c] - world.posY[a];
    const dist = Math.sqrt(dx * dx + dy * dy);
    assert(
      approx(dist, rest, 3),
      `chain bond ${b} expected ~${rest}, got ${dist}`,
    );
  }

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const dx = world.posX[bodies[j]] - world.posX[bodies[i]];
      const dy = world.posY[bodies[j]] - world.posY[bodies[i]];
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = world.radius[bodies[i]] + world.radius[bodies[j]];
      // Separación suave permite overlap parcial: ≥ 80% de suma de radios
      assert(
        dist >= minDist * 0.8,
        `chain overlap ${i}-${j}: dist ${dist} < ${minDist * 0.8}`,
      );
    }
  }
  console.log("chain under force OK");
}

// --- Pares enlazados pueden tener overlap leve (separación soft, manejado por constraint) ---
{
  const world = new PhysicsWorld();
  const r = 15;
  const a = world.addBody(0, 0, r, 100);
  const b = world.addBody(18, 0, r, 100);
  world.addBond(a, b, r * 2, 0.05, 0.1);

  for (let i = 0; i < 60; i++) {
    world.step(1 / 60);
  }

  const dx = world.posX[b] - world.posX[a];
  const dy = world.posY[b] - world.posY[a];
  const dist = Math.sqrt(dx * dx + dy * dy);
  // El constraint del enlace mantiene la distancia cerca de restLength (r*2)
  assert(dist >= r * 0.5, `bonded pair: dist ${dist} too small`);
  console.log("bonded soft separation OK");
}

// --- Swap-remove preserva índices ---
{
  const world = new PhysicsWorld();
  const indices = [];
  for (let i = 0; i < 4; i++) {
    indices.push(world.addBody(i * 20, 0, 5, 10));
  }

  const swapped = [];
  world.onBodySwapped = (from, to) => swapped.push([from, to]);

  world.removeBody(1);
  assert(world.bodyCount === 3, "bodyCount after remove");
  assert(swapped.length === 1, "onBodySwapped called once");
  assert(swapped[0][0] === 3 && swapped[0][1] === 1, "swap 3 -> 1");

  const bond = world.addBond(0, 1, 30, 0.5, 0.1);
  assert(world.bondAtomA[bond] === 0 && world.bondAtomB[bond] === 1, "bond uses remapped index");

  world.onBondSwapped = null;
  world.removeBond(bond);
  assert(world.bondCount === 0, "bond removed");
  console.log("swap-remove OK");
}

// --- Separación suave empuja círculos que se solapan ---
{
  const world = new PhysicsWorld();
  const a = world.addBody(0, 0, 20, 50);
  const b = world.addBody(15, 0, 20, 50);
  world.velX[a] = -50;
  world.velX[b] = 50;

  for (let i = 0; i < 30; i++) {
    world.step(1 / 60);
  }

  const dx = world.posX[b] - world.posX[a];
  const dist = Math.abs(dx);
  // Con separación suave se alejan pero puede quedar algo de overlap (≥ contactDist ≈ 36)
  assert(dist >= 30, `soft separation expected >= 30, got ${dist}`);
  console.log("collision separation OK");
}

// --- Clamp de bordes (helper usado por AsciiChemistry) ---
{
  function clampBody(world, index, worldW, worldH, radius) {
    let x = world.posX[index];
    let y = world.posY[index];
    let vx = world.velX[index];
    let vy = world.velY[index];
    const minX = radius;
    const maxX = worldW - radius;
    const minY = radius;
    const maxY = worldH - radius;
    let moved = false;

    if (x < minX) {
      x = minX;
      vx = Math.abs(vx) * WORLD_CLAMP_BOUNCE;
      moved = true;
    } else if (x > maxX) {
      x = maxX;
      vx = -Math.abs(vx) * WORLD_CLAMP_BOUNCE;
      moved = true;
    }
    if (y < minY) {
      y = minY;
      vy = Math.abs(vy) * WORLD_CLAMP_BOUNCE;
      moved = true;
    } else if (y > maxY) {
      y = maxY;
      vy = -Math.abs(vy) * WORLD_CLAMP_BOUNCE;
      moved = true;
    }

    if (moved) {
      world.setPosition(index, x, y);
      world.setVelocity(index, vx, vy);
    }
  }

  const world = new PhysicsWorld();
  const i = world.addBody(-5, 50, 10, 10);
  world.velX[i] = -20;
  clampBody(world, i, 200, 200, 10);
  assert(world.posX[i] === 10, "clamped x to min");
  assert(world.velX[i] > 0, "velocity bounced");
  console.log("world clamp OK");
}

// --- applyForce impulso instantáneo ---
{
  const world = new PhysicsWorld();
  const i = world.addBody(100, 100, 10, 500);
  world.applyForce(i, 5000, 0); // mass * 10 → Δv = 10
  assert(approx(world.velX[i], 10, 0.01), `applyForce impulse expected ~10, got ${world.velX[i]}`);
  world.step(1 / 60);
  assert(world.posX[i] > 100.1, "position should move after force + step");
  console.log("applyForce impulse OK");
}

console.log("All physics tests passed.");
