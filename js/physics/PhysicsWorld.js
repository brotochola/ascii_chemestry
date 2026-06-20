// ============================================================
// ASCII Chemistry — PhysicsWorld.js
// Motor 2D SoA: círculos, resortes de distancia, colisiones
// ============================================================

import {
  FRICTION_AIR,
  RESTITUTION,
  POSITION_ITERATIONS,
  COLLISION_ITERATIONS,
  SOLVER_SUBSTEPS,
  BOND_CORRECTION_ALPHA,
  CONSTRAINT_BAUMGARTE,
  INITIAL_BODY_CAPACITY,
  INITIAL_BOND_CAPACITY,
  SEPARATION_FORCE_STRENGTH,
  SEPARATION_OVERLAP_FACTOR,
} from "./physicsConstants.js";

export class PhysicsWorld {
  constructor() {
    this._growBodies(INITIAL_BODY_CAPACITY);
    this._growBonds(INITIAL_BOND_CAPACITY);
    this.bodyCount = 0;
    this.bondCount = 0;

    /** @type {((from: number, to: number) => void) | null} */
    this.onBodySwapped = null;
    /** @type {((from: number, to: number) => void) | null} */
    this.onBondSwapped = null;

    this._collisionCellSize = 80;
    this._collisionBuckets = new Map();
    /** @type {Set<number>} pares con enlace activo (índice canónico) */
    this._bondedPairs = new Set();
  }

  _pairKey(i, j) {
    return i < j ? i * 65536 + j : j * 65536 + i;
  }

  _rebuildBondedPairs() {
    this._bondedPairs.clear();
    for (let b = 0; b < this.bondCount; b++) {
      if (!this.bondActive[b]) continue;
      this._bondedPairs.add(
        this._pairKey(this.bondAtomA[b], this.bondAtomB[b]),
      );
    }
  }

  _areBonded(i, j) {
    return this._bondedPairs.has(this._pairKey(i, j));
  }

  _growBodies(capacity) {
    const grow = (arr, Ctor, fill = 0) => {
      const next = new Ctor(capacity);
      if (arr) next.set(arr);
      if (fill !== undefined && !arr) next.fill(fill);
      return next;
    };

    this.posX = grow(this.posX, Float64Array);
    this.posY = grow(this.posY, Float64Array);
    this.velX = grow(this.velX, Float64Array);
    this.velY = grow(this.velY, Float64Array);
    this.forceX = grow(this.forceX, Float64Array);
    this.forceY = grow(this.forceY, Float64Array);
    this.mass = grow(this.mass, Float64Array);
    this.invMass = grow(this.invMass, Float64Array);
    this.radius = grow(this.radius, Float64Array);
    this.active = grow(this.active, Uint8Array, 0);
    this._bodyCapacity = capacity;
  }

  _growBonds(capacity) {
    const grow = (arr, Ctor, fill = 0) => {
      const next = new Ctor(capacity);
      if (arr) next.set(arr);
      if (fill !== undefined && !arr) next.fill(fill);
      return next;
    };

    this.bondAtomA = grow(this.bondAtomA, Uint32Array);
    this.bondAtomB = grow(this.bondAtomB, Uint32Array);
    this.restLength = grow(this.restLength, Float64Array);
    this.stiffness = grow(this.stiffness, Float64Array);
    this.damping = grow(this.damping, Float64Array);
    this.bondActive = grow(this.bondActive, Uint8Array, 0);
    this._bondCapacity = capacity;
  }

  _ensureBodyCapacity() {
    if (this.bodyCount < this._bodyCapacity) return;
    this._growBodies(this._bodyCapacity * 2);
  }

  _ensureBondCapacity() {
    if (this.bondCount < this._bondCapacity) return;
    this._growBonds(this._bondCapacity * 2);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @param {number} mass
   * @returns {number}
   */
  addBody(x, y, radius, mass) {
    this._ensureBodyCapacity();
    const i = this.bodyCount++;
    this.posX[i] = x;
    this.posY[i] = y;
    this.velX[i] = 0;
    this.velY[i] = 0;
    this.forceX[i] = 0;
    this.forceY[i] = 0;
    this.radius[i] = radius;
    this.setBodyMass(i, mass);
    this.active[i] = 1;
    return i;
  }

  /**
   * @param {number} index
   */
  removeBody(index) {
    if (index < 0 || index >= this.bodyCount || !this.active[index]) return;

    for (let b = 0; b < this.bondCount; b++) {
      if (!this.bondActive[b]) continue;
      if (this.bondAtomA[b] === index || this.bondAtomB[b] === index) {
        this.removeBond(b);
      }
    }

    const last = this.bodyCount - 1;
    if (index !== last) {
      this._copyBody(last, index);
      this._remapBodyIndex(last, index);
      this.onBodySwapped?.(last, index);
    }

    this.active[last] = 0;
    this.bodyCount = last;
  }

  _copyBody(from, to) {
    this.posX[to] = this.posX[from];
    this.posY[to] = this.posY[from];
    this.velX[to] = this.velX[from];
    this.velY[to] = this.velY[from];
    this.forceX[to] = this.forceX[from];
    this.forceY[to] = this.forceY[from];
    this.mass[to] = this.mass[from];
    this.invMass[to] = this.invMass[from];
    this.radius[to] = this.radius[from];
    this.active[to] = this.active[from];
  }

  _remapBodyIndex(from, to) {
    for (let b = 0; b < this.bondCount; b++) {
      if (!this.bondActive[b]) continue;
      if (this.bondAtomA[b] === from) this.bondAtomA[b] = to;
      if (this.bondAtomB[b] === from) this.bondAtomB[b] = to;
    }
  }

  /**
   * @param {number} a
   * @param {number} b
   * @param {number} restLength
   * @param {number} stiffness
   * @param {number} damping
   * @returns {number}
   */
  addBond(a, b, restLength, stiffness, damping) {
    this._ensureBondCapacity();
    const i = this.bondCount++;
    this.bondAtomA[i] = a;
    this.bondAtomB[i] = b;
    this.restLength[i] = restLength;
    this.stiffness[i] = stiffness;
    this.damping[i] = damping;
    this.bondActive[i] = 1;
    this._bondedPairs.add(this._pairKey(a, b));
    return i;
  }

  /**
   * @param {number} index
   */
  removeBond(index) {
    if (index < 0 || index >= this.bondCount || !this.bondActive[index]) return;

    this._bondedPairs.delete(
      this._pairKey(this.bondAtomA[index], this.bondAtomB[index]),
    );

    const last = this.bondCount - 1;
    if (index !== last) {
      this._copyBond(last, index);
      this._bondedPairs.add(
        this._pairKey(this.bondAtomA[index], this.bondAtomB[index]),
      );
      this.onBondSwapped?.(last, index);
    }

    this.bondActive[last] = 0;
    this.bondCount = last;
  }

  _copyBond(from, to) {
    this.bondAtomA[to] = this.bondAtomA[from];
    this.bondAtomB[to] = this.bondAtomB[from];
    this.restLength[to] = this.restLength[from];
    this.stiffness[to] = this.stiffness[from];
    this.damping[to] = this.damping[from];
    this.bondActive[to] = this.bondActive[from];
  }

  /**
   * @param {number} index
   * @param {number} mass
   */
  setBodyMass(index, mass) {
    this.mass[index] = mass;
    this.invMass[index] = mass > 0 ? 1 / mass : 0;
  }

  /**
   * @param {number} index
   * @param {number} radius
   */
  setBodyRadius(index, radius) {
    this.radius[index] = radius;
  }

  /**
   * @param {number} index
   * @param {number} vx
   * @param {number} vy
   */
  setVelocity(index, vx, vy) {
    this.velX[index] = vx;
    this.velY[index] = vy;
  }

  /**
   * @param {number} index
   * @param {number} x
   * @param {number} y
   */
  setPosition(index, x, y) {
    this.posX[index] = x;
    this.posY[index] = y;
  }

  /**
   * @param {number} index
   * @param {number} fx
   * @param {number} fy
   */
  /**
   * Impulso instantáneo (compatible con Matter Body.applyForce + un paso de motor).
   * fx/fy son Newtons; Δv = F/m se aplica de inmediato a la velocidad.
   */
  applyForce(index, fx, fy) {
    if (index < 0 || index >= this.bodyCount || !this.active[index]) return;
    const invM = this.invMass[index];
    this.velX[index] += fx * invM;
    this.velY[index] += fy * invM;
  }

  /**
   * @param {number} dt — segundos
   */
  step(dt) {
    if (dt <= 0) return;

    this._rebuildBondedPairs();

    const n = this.bodyCount;
    const drag = Math.max(0, 1 - FRICTION_AIR * dt);

    for (let i = 0; i < n; i++) {
      if (!this.active[i]) continue;

      this.velX[i] *= drag;
      this.velY[i] *= drag;
      this.posX[i] += this.velX[i] * dt;
      this.posY[i] += this.velY[i] * dt;
    }

    for (let sub = 0; sub < SOLVER_SUBSTEPS; sub++) {
      this._applySeparationForces();
      this._solveBonds(dt);
    }
  }

  /**
   * Constraint de distancia blanda: corrige parcialmente hacia restLength.
   * La separación sin solape (colisiones) tiene prioridad y se aplica después.
   */
  _solveBonds(dt) {
    const invDt = dt > 0 ? 1 / dt : 0;

    for (let iter = 0; iter < POSITION_ITERATIONS; iter++) {
      const lastIter = iter === POSITION_ITERATIONS - 1;

      for (let b = 0; b < this.bondCount; b++) {
        if (!this.bondActive[b]) continue;

        const a = this.bondAtomA[b];
        const c = this.bondAtomB[b];
        if (!this.active[a] || !this.active[c]) continue;

        let dx = this.posX[c] - this.posX[a];
        let dy = this.posY[c] - this.posY[a];
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1e-8) {
          dist = 1e-8;
          dx = 1e-8;
          dy = 0;
        }

        const C = dist - this.restLength[b];
        if (Math.abs(C) < 1e-6) continue;

        const nx = dx / dist;
        const ny = dy / dist;
        const wA = this.invMass[a];
        const wB = this.invMass[c];
        const wSum = wA + wB;
        if (wSum <= 0) continue;

        const alpha = Math.min(1, this.stiffness[b] * 8 + BOND_CORRECTION_ALPHA);
        const lambda = (C / wSum) * alpha;

        this.posX[a] += nx * lambda * wA;
        this.posY[a] += ny * lambda * wA;
        this.posX[c] -= nx * lambda * wB;
        this.posY[c] -= ny * lambda * wB;

        if (lastIter) {
          const rvx = this.velX[c] - this.velX[a];
          const rvy = this.velY[c] - this.velY[a];
          const vn = rvx * nx + rvy * ny;
          const bias = CONSTRAINT_BAUMGARTE * C * invDt * alpha;
          const j = -(vn + bias) / wSum;
          this.velX[a] -= nx * j * wA;
          this.velY[a] -= ny * j * wA;
          this.velX[c] += nx * j * wB;
          this.velY[c] += ny * j * wB;
        }
      }
    }
  }

  /**
   * Separación suave tipo boids: aplica una fuerza repulsiva proporcional al overlap.
   * Permite overlap parcial (controlado por SEPARATION_OVERLAP_FACTOR).
   * Los pares enlazados se saltan — el constraint de enlace gestiona esa distancia.
   */
  _applySeparationForces() {
    const cellSize = this._collisionCellSize;
    const buckets = this._collisionBuckets;
    buckets.clear();

    const n = this.bodyCount;
    for (let i = 0; i < n; i++) {
      if (!this.active[i]) continue;
      const cx = (this.posX[i] / cellSize) | 0;
      const cy = (this.posY[i] / cellSize) | 0;
      const key = cx + cy * 100000;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(i);
    }

    const checked = new Set();

    for (const [key, indices] of buckets) {
      const cx = key % 100000;
      const cy = (key / 100000) | 0;

      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const neighbor = buckets.get(cx + ox + (cy + oy) * 100000);
          if (!neighbor) continue;

          for (const i of indices) {
            for (const j of neighbor) {
              if (j <= i) continue;
              const pairKey = i < j ? i * 65536 + j : j * 65536 + i;
              if (checked.has(pairKey)) continue;
              checked.add(pairKey);
              this._applySeparationPair(i, j);
            }
          }
        }
      }
    }
  }

  _applySeparationPair(i, j) {
    if (!this.active[i] || !this.active[j]) return;
    if (this._areBonded(i, j)) return;

    let dx = this.posX[j] - this.posX[i];
    let dy = this.posY[j] - this.posY[i];
    const contactDist = (this.radius[i] + this.radius[j]) * SEPARATION_OVERLAP_FACTOR;
    const distSq = dx * dx + dy * dy;

    if (distSq >= contactDist * contactDist) return;

    let dist = Math.sqrt(distSq);
    if (dist < 1e-8) {
      dist = 1e-8;
      dx = 1e-8;
      dy = 0;
    }

    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = (contactDist - dist) / contactDist;
    const forceMag = overlap * SEPARATION_FORCE_STRENGTH;

    const invMassI = this.invMass[i];
    const invMassJ = this.invMass[j];
    const invSum = invMassI + invMassJ;
    if (invSum <= 0) return;

    this.velX[i] -= nx * forceMag * invMassI;
    this.velY[i] -= ny * forceMag * invMassI;
    this.velX[j] += nx * forceMag * invMassJ;
    this.velY[j] += ny * forceMag * invMassJ;
  }
}
