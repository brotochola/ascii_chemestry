// ============================================================
// ASCII Chemistry — SpatialHash.js
// ============================================================

export class SpatialHash {
  /**
   * @param {number} width
   * @param {number} height
   * @param {number} cellSize
   */
  constructor(width, height, cellSize) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.numCellsX = Math.ceil(width / cellSize);
    this.numCellsY = Math.ceil(height / cellSize);
    this.buckets = new Map();
  }

  clear() {
    this.buckets.clear();
  }

  _cellCoords(x, y) {
    return {
      x: Math.floor(x / this.cellSize),
      y: Math.floor(y / this.cellSize),
    };
  }

  _inBounds(cx, cy) {
    return (
      cx >= 0 && cx < this.numCellsX && cy >= 0 && cy < this.numCellsY
    );
  }

  _key(cx, cy) {
    return cx + cy * this.numCellsX;
  }

  insert(atom) {
    const x = atom.x;
    const y = atom.y;
    const { x: cx, y: cy } = this._cellCoords(x, y);
    if (!this._inBounds(cx, cy)) return;
    const key = this._key(cx, cy);
    if (!this.buckets.has(key)) this.buckets.set(key, []);
    this.buckets.get(key).push(atom);
  }

  /** Átomos en la celda del átomo y las 8 adyacentes. */
  queryNeighbors(atom) {
    const x = atom.x;
    const y = atom.y;
    const { x: cx, y: cy } = this._cellCoords(x, y);
    const results = [];

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!this._inBounds(nx, ny)) continue;
        const bucket = this.buckets.get(this._key(nx, ny));
        if (!bucket) continue;
        for (const other of bucket) {
          if (other !== atom) results.push(other);
        }
      }
    }

    return results;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @returns {import('./Atom.js').Atom[]}
   */
  queryRadiusFromBuckets(x, y, radius) {
    const results = [];
    const radiusSq = radius * radius;
    const cellRadius = Math.ceil(radius / this.cellSize);
    const { x: cx, y: cy } = this._cellCoords(x, y);

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!this._inBounds(nx, ny)) continue;
        const bucket = this.buckets.get(this._key(nx, ny));
        if (!bucket) continue;
        for (const atom of bucket) {
          const ddx = atom.x - x;
          const ddy = atom.y - y;
          if (ddx * ddx + ddy * ddy <= radiusSq) {
            results.push(atom);
          }
        }
      }
    }

    return results;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {number} radius
   * @param {import('./Atom.js').Atom[]} atoms
   */
  queryRadius(x, y, radius, atoms) {
    this.clear();
    for (const atom of atoms) this.insert(atom);
    return this.queryRadiusFromBuckets(x, y, radius);
  }
}
