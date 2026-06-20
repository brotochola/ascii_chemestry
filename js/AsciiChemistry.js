// ============================================================
// ASCII Chemistry — AsciiChemistry.js
// Clase central: orquesta PixiJS + motor físico SoA
// ============================================================
import { Application, Container, Graphics, Text } from "pixi.js";
import { Atom } from "./Atom.js";
import { Bond } from "./Bond.js";
import { Molecule } from "./Molecule.js";
import { Protein } from "./Protein.js";
import { SpatialHash } from "./SpatialHash.js";
import { Camera } from "./Camera.js";
import { PhysicsWorld } from "./physics/PhysicsWorld.js";
import { WORLD_CLAMP_BOUNCE } from "./physics/physicsConstants.js";
import { distanceSquared, directionFromDelta } from "./utils.js";
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  INITIAL_ATOM_COUNT,
  REPULSE_STRENGTH,
  REPULSE_MIN_DIST,
} from "./constants/app.js";
import {
  BOND_DISTANCE_FACTOR,
  CHEMISTRY_TICK_MS,
  SPATIAL_HASH_CELL_SIZE,
  POLARITY_FORCE_MIN_DIST,
  POLARITY_FORCE_RADIUS,
  CONNECTOR_MAX_CONNECTIONS,
} from "./constants/chemistry.js";
import { canBondByPolarity, polarityForceOnA } from "./polarity.js";
import { shouldBreakBond } from "./bondStrength.js";
import {
  ZOOM_WHEEL_FACTOR,
  WORLD_BOUNDS_BORDER_COLOR,
  WORLD_BOUNDS_BORDER_WIDTH,
  WORLD_BOUNDS_OUTSIDE_DIM_COLOR,
  WORLD_BOUNDS_OUTSIDE_DIM_ALPHA,
  FPS_HUD_FILL,
  FPS_HUD_FONT_SIZE,
  FPS_HUD_PADDING_X,
  FPS_HUD_PADDING_Y,
} from "./constants/render.js";

export class AsciiChemistry {
  /**
   * @param {HTMLElement} container — elemento DOM donde montar el canvas
   */
  constructor(container) {
    //my own debug.
    window.juego = this; //do not delete this line

    this.container = container;

    /** @type {import('pixi.js').Application | null} */
    this.app = null;

    /** @type {PhysicsWorld} */
    this.physics = new PhysicsWorld();
    this.physics._collisionCellSize = SPATIAL_HASH_CELL_SIZE;

    /** @type {Atom[]} */
    this.atoms = [];

    /** @type {Bond[]} */
    this.bonds = [];

    /** @type {Molecule[]} */
    this.molecules = [];

    /** @type {import('./Protein.js').Protein[]} */
    this.proteins = [];

    this._spatialHash = new SpatialHash(
      WORLD_WIDTH,
      WORLD_HEIGHT,
      SPATIAL_HASH_CELL_SIZE,
    );

    this._connectorTopologyDirty = true;

    this._chemTimeout = null;
    this.mouse = { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT / 2 };
    this._isPanning = false;
    this._panStart = { x: 0, y: 0 };
    this._cameraStart = { x: 0, y: 0 };
    this._nextId = 0;
    this._fpsSmooth = 0;
    /** @type {string | null} carácter ASCII válido para spawn mientras está apretado */
    this._heldSpawnKey = null;

    this.physics.onBodySwapped = (from, to) => {
      for (const atom of this.atoms) {
        if (atom.physicsIndex === from) {
          atom.physicsIndex = to;
          break;
        }
      }
    };

    this.physics.onBondSwapped = (from, to) => {
      for (const bond of this.bonds) {
        if (bond.physicsBondIndex === from) {
          bond.physicsBondIndex = to;
          break;
        }
      }
    };
  }

  /** @returns {number} */
  nextId() {
    return this._nextId++;
  }

  async init() {
    this.app = new Application();
    await this.app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      background: 0x080810,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      resizeTo: window,
    });

    this.container.appendChild(this.app.canvas);

    this.worldContainer = new Container();
    this.boundsLayer = new Container();
    this.bondsLayer = new Container();
    this.atomsLayer = new Container();
    this.worldContainer.addChild(this.boundsLayer);
    this.worldContainer.addChild(this.bondsLayer);
    this.worldContainer.addChild(this.atomsLayer);
    this.app.stage.addChild(this.worldContainer);

    this.uiLayer = new Container();
    this.uiLayer.eventMode = "none";
    this.boundsScreenGraphics = new Graphics();
    this.boundsScreenGraphics.eventMode = "none";
    this.uiLayer.addChild(this.boundsScreenGraphics);
    this._createFpsHud();
    this.app.stage.addChild(this.uiLayer);

    this._createWorldBoundsVisual();

    this.camera = new Camera(this.worldContainer);
    this.camera.centerOn(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT / 2,
      this.app.screen.width,
      this.app.screen.height,
    );
    this.camera.clampPan(
      WORLD_WIDTH,
      WORLD_HEIGHT,
      this.app.screen.width,
      this.app.screen.height,
    );

    this._setupInput();
    this.spawnRandom(INITIAL_ATOM_COUNT);
  }

  start() {
    this.app.ticker.add((ticker) => this._tick(ticker));
    this._chemistryTick();
  }

  spawnAtom(char, x, y) {
    return this._addAtom(new Atom({ char, x, y, game: this }));
  }

  spawnRandom(count) {
    for (let i = 0; i < count; i++) {
      const atom = this._addAtom(
        Atom.createRandom({
          x: Math.random() * WORLD_WIDTH,
          y: Math.random() * WORLD_HEIGHT,
          game: this,
        }),
      );
      this.physics.setVelocity(
        atom.physicsIndex,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
      );
    }
  }

  _addAtom(atom) {
    atom.arrayIndex = this.atoms.length;
    atom.physicsIndex = this.physics.addBody(
      atom._spawnX,
      atom._spawnY,
      atom.radius,
      atom.mass,
    );
    this.atoms.push(atom);
    this.atomsLayer.addChild(atom.container);
    atom.syncVisual();
    return atom;
  }

  _tick(ticker) {
    this._updateFps(ticker.deltaMS);
    this._updatePhysics(ticker.deltaMS);
    this._render();
  }

  _createFpsHud() {
    this._fpsText = new Text({
      text: "— FPS",
      style: {
        fontFamily: "monospace",
        fontSize: FPS_HUD_FONT_SIZE,
        fill: FPS_HUD_FILL,
      },
    });
    this._fpsText.position.set(FPS_HUD_PADDING_X, FPS_HUD_PADDING_Y);
    this.uiLayer.addChild(this._fpsText);
  }

  /** @param {number} deltaMS */
  _updateFps(deltaMS) {
    const instant = 1000 / Math.max(deltaMS, 1);
    this._fpsSmooth =
      this._fpsSmooth === 0 ? instant : this._fpsSmooth * 0.9 + instant * 0.1;
    this._fpsText.text = `${Math.round(this._fpsSmooth)} FPS`;
  }

  _updatePhysics(deltaMS) {
    this.physics.step(deltaMS / 1000);
    this._clampAtomsToWorld();
  }

  _clampAtomsToWorld() {
    const p = this.physics;
    for (const atom of this.atoms) {
      const i = atom.physicsIndex;
      const r = atom.radius;
      let x = p.posX[i];
      let y = p.posY[i];
      const minX = r;
      const maxX = WORLD_WIDTH - r;
      const minY = r;
      const maxY = WORLD_HEIGHT - r;
      let vx = p.velX[i];
      let vy = p.velY[i];
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
        p.setPosition(i, x, y);
        p.setVelocity(i, vx, vy);
      }
    }
  }

  _createWorldBoundsVisual() {
    this.boundsGraphics = new Graphics();
    this.boundsLayer.addChild(this.boundsGraphics);
  }

  _updateScreenBoundsOverlay() {
    const g = this.boundsScreenGraphics;
    const sw = this.app.screen.width;
    const sh = this.app.screen.height;
    const zoom = this.camera.zoom;
    const x0 = this.camera.x;
    const y0 = this.camera.y;
    const x1 = x0 + WORLD_WIDTH * zoom;
    const y1 = y0 + WORLD_HEIGHT * zoom;
    const dim = {
      color: WORLD_BOUNDS_OUTSIDE_DIM_COLOR,
      alpha: WORLD_BOUNDS_OUTSIDE_DIM_ALPHA,
    };

    g.clear();

    if (y0 > 0) {
      g.rect(0, 0, sw, y0);
      g.fill(dim);
    }
    if (y1 < sh) {
      g.rect(0, y1, sw, sh - y1);
      g.fill(dim);
    }
    if (x0 > 0) {
      g.rect(0, Math.max(0, y0), x0, Math.min(sh, y1) - Math.max(0, y0));
      g.fill(dim);
    }
    if (x1 < sw) {
      g.rect(x1, Math.max(0, y0), sw - x1, Math.min(sh, y1) - Math.max(0, y0));
      g.fill(dim);
    }

    g.moveTo(x0, y0);
    g.lineTo(x1, y0);
    g.lineTo(x1, y1);
    g.lineTo(x0, y1);
    g.lineTo(x0, y0);
    g.stroke({
      color: WORLD_BOUNDS_BORDER_COLOR,
      width: WORLD_BOUNDS_BORDER_WIDTH,
      alpha: 1,
      cap: "round",
      join: "round",
    });
  }

  _render() {
    // this._updateWorldBoundsVisual();
    this._updateScreenBoundsOverlay();

    const viewW = this.app.screen.width;
    const viewH = this.app.screen.height;
    const bounds = this.camera.getWorldBounds(viewW, viewH);
    const margin = 60;

    for (const bond of this.bonds) {
      const x1 = bond.atomA.x;
      const y1 = bond.atomA.y;
      const x2 = bond.atomB.x;
      const y2 = bond.atomB.y;
      const midX = (x1 + x2) * 0.5;
      const midY = (y1 + y2) * 0.5;
      const visible = this._isInWorldBounds(midX, midY, bounds, margin);
      bond.graphics.visible = visible;
      if (visible) bond.syncVisual();
    }

    for (const atom of this.atoms) {
      const x = atom.x;
      const y = atom.y;
      const visible = this._isInWorldBounds(x, y, bounds, margin + atom.radius);
      atom.container.visible = visible;
      if (visible) atom.syncVisual();
    }
  }

  _isInWorldBounds(x, y, bounds, margin) {
    return (
      x >= bounds.left - margin &&
      x <= bounds.right + margin &&
      y >= bounds.top - margin &&
      y <= bounds.bottom + margin
    );
  }

  /** @param {string} key */
  _isSpawnKey(key) {
    if (key.length !== 1) return false;
    const code = key.charCodeAt(0);
    return code >= 32 && code <= 126;
  }

  _setupInput() {
    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = this.app.screen;

    const updateMouseWorld = (event) => {
      const world = this.camera.screenToWorld(event.global.x, event.global.y);
      this.mouse.x = world.x;
      this.mouse.y = world.y;
    };

    this.app.stage.on("pointermove", (event) => {
      if (this._isPanning) {
        const dx = event.global.x - this._panStart.x;
        const dy = event.global.y - this._panStart.y;
        this.camera.x = this._cameraStart.x + dx;
        this.camera.y = this._cameraStart.y + dy;
        this.camera.apply();
        this.camera.clampPan(
          WORLD_WIDTH,
          WORLD_HEIGHT,
          this.app.screen.width,
          this.app.screen.height,
        );
      }
      updateMouseWorld(event);
      if (this._heldSpawnKey && !this._isPanning) {
        this.spawnAtom(this._heldSpawnKey, this.mouse.x, this.mouse.y);
      }
    });

    this.app.stage.on("pointerdown", (event) => {
      updateMouseWorld(event);

      if (event.button === 1) {
        event.preventDefault();
        this._isPanning = true;
        this._panStart.x = event.global.x;
        this._panStart.y = event.global.y;
        this._cameraStart.x = this.camera.x;
        this._cameraStart.y = this.camera.y;
        return;
      }

      if (event.button === 0) {
        this._repulseFrom(this.mouse.x, this.mouse.y);
      }
    });

    const endPan = () => {
      this._isPanning = false;
    };
    this.app.stage.on("pointerup", endPan);
    this.app.stage.on("pointerupoutside", endPan);

    this.app.canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const factor =
          event.deltaY < 0 ? ZOOM_WHEEL_FACTOR : 1 / ZOOM_WHEEL_FACTOR;
        this.camera.zoomAt(event.offsetX, event.offsetY, factor);
        this.camera.clampPan(
          WORLD_WIDTH,
          WORLD_HEIGHT,
          this.app.screen.width,
          this.app.screen.height,
        );
      },
      { passive: false },
    );

    this.app.renderer.on("resize", () => {
      this.app.stage.hitArea = this.app.screen;
      this.camera.clampPan(
        WORLD_WIDTH,
        WORLD_HEIGHT,
        this.app.screen.width,
        this.app.screen.height,
      );
    });

    window.addEventListener("keydown", (event) => {
      if (event.repeat || !this._isSpawnKey(event.key)) return;
      this._heldSpawnKey = event.key;
      this.spawnAtom(event.key, this.mouse.x, this.mouse.y);
    });

    window.addEventListener("keyup", (event) => {
      if (event.key === this._heldSpawnKey) {
        this._heldSpawnKey = null;
      }
    });

    window.addEventListener("blur", () => {
      this._heldSpawnKey = null;
    });
  }

  _repulseFrom(x, y) {
    const repulseRadius = 1400;
    const neighbors = this._spatialHash.queryRadius(
      x,
      y,
      repulseRadius,
      this.atoms,
    );

    const minDistSq = REPULSE_MIN_DIST * REPULSE_MIN_DIST;
    for (const atom of neighbors) {
      const ax = atom.x;
      const ay = atom.y;
      const dx = ax - x;
      const dy = ay - y;
      const distSq = Math.max(dx * dx + dy * dy, minDistSq);
      const magnitude = REPULSE_STRENGTH / distSq;
      const dir = directionFromDelta(dx, dy);

      const m = atom.mass;
      atom.applyForce(dir.x * magnitude * m, dir.y * magnitude * m);
    }
  }

  _applyPolarityForces() {
    for (const atom of this.atoms) {
      if (!atom.hasActivePolarity) continue;

      for (const other of this._spatialHash.queryRadiusFromBuckets(
        atom.x,
        atom.y,
        POLARITY_FORCE_RADIUS,
      )) {
        if (other === atom) continue;
        if (!other.hasActivePolarity) continue;
        if (atom.isBondedTo(other)) continue;
        if (atom.arrayIndex >= other.arrayIndex) continue;

        const dx = other.x - atom.x;
        const dy = other.y - atom.y;
        const { fx, fy } = polarityForceOnA(
          atom.remainingPolarity,
          other.remainingPolarity,
          dx,
          dy,
          POLARITY_FORCE_MIN_DIST,
        );

        const mA = atom.mass;
        const mB = other.mass;
        atom.applyForce(fx * mA, fy * mA);
        other.applyForce(-fx * mB, -fy * mB);
      }
    }
  }

  _chemistryTick() {
    this._spatialHash.clear();
    for (const atom of this.atoms) {
      this._spatialHash.insert(atom);
    }
    this._applyPolarityForces();
    this._breakOverstretchedBonds();
    for (const mol of [...this.molecules]) {
      mol.tickBehaviors();
    }
    for (const atom of this.atoms) {
      atom.chemistryTick();
    }
    if (this._connectorTopologyDirty) {
      this._sanitizeConnectorTopology();
      this._detectProteins();
      this._connectorTopologyDirty = false;
    }
    this._chemTimeout = setTimeout(
      () => this._chemistryTick(),
      CHEMISTRY_TICK_MS,
    );
  }

  /** @param {import('./Molecule.js').Molecule} mol */
  dissolveMolecule(mol) {
    mol.dissolve();
  }

  _removeBond(bond) {
    console.log("removeBond", bond);
    if (bond.isConnectorBond) this._connectorTopologyDirty = true;
    if (bond.physicsBondIndex >= 0) {
      this.physics.removeBond(bond.physicsBondIndex);
      bond.physicsBondIndex = -1;
    }
    bond.dissolve();
    this.bonds = this.bonds.filter((b) => b !== bond);
  }

  _breakOverstretchedBonds() {
    const toBreak = [];
    for (const bond of this.bonds) {
      if (shouldBreakBond(bond)) toBreak.push(bond);
    }

    for (const bond of toBreak) {
      const mol =
        bond.atomA.molecule &&
        bond.atomB.molecule &&
        bond.atomA.molecule === bond.atomB.molecule
          ? bond.atomA.molecule
          : null;
      const splitMolecule = mol !== null && !bond.isConnectorBond;

      this._removeBond(bond);

      if (splitMolecule && mol && this.molecules.includes(mol)) {
        this._splitMoleculeAfterBondBreak(mol);
      }
    }
  }

  /** @param {import('./Molecule.js').Molecule} mol */
  _splitMoleculeAfterBondBreak(mol) {
    const atomSet = new Set(mol.atoms);
    /** @type {Map<import('./Atom.js').Atom, import('./Atom.js').Atom[]>} */
    const adj = new Map();
    for (const atom of mol.atoms) adj.set(atom, []);

    for (const atom of mol.atoms) {
      for (const bond of atom.connections) {
        if (bond.isConnectorBond) continue;
        const other = bond.otherAtom(atom);
        if (!atomSet.has(other)) continue;
        adj.get(atom).push(other);
      }
    }

    const visited = new Set();
    /** @type {import('./Atom.js').Atom[][]} */
    const components = [];

    for (const atom of mol.atoms) {
      if (visited.has(atom)) continue;
      const component = [];
      const queue = [atom];
      while (queue.length > 0) {
        const cur = queue.shift();
        if (visited.has(cur)) continue;
        visited.add(cur);
        component.push(cur);
        for (const neighbor of adj.get(cur) ?? []) {
          if (!visited.has(neighbor)) queue.push(neighbor);
        }
      }
      components.push(component);
    }

    if (components.length <= 1) {
      mol.recalculateProperties();
      return;
    }

    mol.protein = null;
    mol.atoms = components[0];
    for (const atom of mol.atoms) {
      atom.molecule = mol;
      atom.protein = null;
    }
    mol._invalidateString();
    mol.recalculateProperties();

    this._connectorTopologyDirty = true;

    for (let i = 1; i < components.length; i++) {
      const newMol = new Molecule(components[i], this);
      this.molecules.push(newMol);
    }
  }

  /**
   * Limpia enlaces conector inválidos. Un conector con 1 enlace a una molécula
   * es válido (esperando la segunda). Solo se quitan enlaces huérfanos.
   */
  _sanitizeConnectorTopology() {
    const toRemove = new Set();

    for (const atom of this.atoms) {
      if (!atom.isConnector) continue;
      for (const bond of atom.connections) {
        if (!bond.isConnectorBond) continue;
        const linked = bond.otherAtom(atom);
        if (!linked.isConnector && linked.molecule === null) {
          toRemove.add(bond);
        }
      }
    }

    for (const atom of this.atoms) {
      if (atom.isConnector || atom.molecule !== null) continue;
      for (const bond of atom.connections) {
        if (bond.isConnectorBond) toRemove.add(bond);
      }
    }

    for (const bond of toRemove) {
      if (this.bonds.includes(bond)) this._removeBond(bond);
    }
  }

  /**
   * @returns {boolean} true si se creó un enlace molecular (átomo común ↔ común)
   */
  tryCreateMoleculeBond(atomA, atomB) {
    if (atomA.isConnector || atomB.isConnector) return false;
    if (atomA.isBondedTo(atomB)) return false;
    if (atomA.arrayIndex >= atomB.arrayIndex) return false;
    if (!canBondByPolarity(atomA.remainingPolarity, atomB.remainingPolarity)) {
      return false;
    }

    const reach = (atomA.radius + atomB.radius) * BOND_DISTANCE_FACTOR;
    const reachSq = reach * reach;
    if (distanceSquared(atomA.x, atomA.y, atomB.x, atomB.y) > reachSq) {
      return false;
    }

    const bond = new Bond({ atomA, atomB, game: this });
    this.bonds.push(bond);
    this._updateMoleculesOnBond(atomA, atomB);
    return true;
  }

  /**
   * @returns {boolean} true si se creó un enlace conector ↔ átomo en molécula
   */
  tryCreateConnectorBond(connector, atom) {
    if (!connector.isConnector || atom.isConnector) return false;
    if (atom.molecule === null) return false;
    if (connector.isBondedTo(atom)) return false;
    if (connector.connections.size >= CONNECTOR_MAX_CONNECTIONS) return false;
    if (atom.connectorBondCount() >= 1) return false;
    if (
      !canBondByPolarity(connector.remainingPolarity, atom.remainingPolarity)
    ) {
      return false;
    }

    for (const bond of connector.connections) {
      const linked = bond.otherAtom(connector);
      if (!linked.isConnector && linked.molecule === atom.molecule) {
        return false;
      }
    }

    if (atom.molecule.getConnectorBondCount() >= 2) return false;

    const reach = (connector.radius + atom.radius) * BOND_DISTANCE_FACTOR;
    const reachSq = reach * reach;
    if (distanceSquared(connector.x, connector.y, atom.x, atom.y) > reachSq) {
      return false;
    }

    const bond = new Bond({
      atomA: connector,
      atomB: atom,
      game: this,
      isConnectorBond: true,
    });
    this.bonds.push(bond);
    this._connectorTopologyDirty = true;
    return true;
  }

  _breakConnectorBondsAfterMerge(_survivor, absorbed) {
    for (const atom of absorbed.atoms) {
      for (const bond of [...atom.connections]) {
        if (bond.isConnectorBond) this._removeBond(bond);
      }
    }
    this._sanitizeConnectorTopology();
  }

  _detectProteins() {
    const molOf = new Map();
    for (const mol of this.molecules) {
      for (const atom of mol.atoms) molOf.set(atom, mol);
    }

    const links = [];
    for (const conn of this.atoms.filter(
      (a) => a.isConnector && a.connections.size === CONNECTOR_MAX_CONNECTIONS,
    )) {
      const linked = [...conn.connections].map((b) => b.otherAtom(conn));
      if (linked.length !== 2) continue;
      const molA = molOf.get(linked[0]);
      const molB = molOf.get(linked[1]);
      if (molA && molB && molA !== molB) {
        links.push({ connector: conn, molA, molB });
      }
    }

    const adj = new Map();
    for (const { connector, molA, molB } of links) {
      if (!adj.has(molA)) adj.set(molA, []);
      if (!adj.has(molB)) adj.set(molB, []);
      adj.get(molA).push({ mol: molB, connector });
      adj.get(molB).push({ mol: molA, connector });
    }

    const visited = new Set();
    const prevProteinAtoms = new Set();
    for (const protein of this.proteins) {
      for (const mol of protein.orderedMolecules) {
        for (const atom of mol.atoms) prevProteinAtoms.add(atom);
      }
      for (const conn of protein.connectors) {
        if (conn) prevProteinAtoms.add(conn);
      }
    }

    for (const mol of this.molecules) mol.protein = null;
    for (const atom of this.atoms) atom.protein = null;
    this.proteins = [];

    for (const startMol of adj.keys()) {
      if (visited.has(startMol)) continue;

      const queue = [startMol];
      const component = [];
      while (queue.length) {
        const cur = queue.shift();
        if (visited.has(cur)) continue;
        visited.add(cur);
        component.push(cur);
        for (const { mol } of adj.get(cur) ?? []) {
          if (!visited.has(mol)) queue.push(mol);
        }
      }

      if (component.length >= 2) {
        const ordered = this._orderProteinChain(component, adj);
        const connectors = this._extractProteinConnectors(ordered, adj);
        const protein = new Protein(ordered, connectors, this);
        for (const mol of ordered) mol.protein = protein;
        for (const conn of connectors) {
          if (conn) conn.protein = protein;
        }
        protein.applyVisuals();
        this.proteins.push(protein);
      }
    }

    for (const atom of prevProteinAtoms) {
      if (!atom.protein && !atom.molecule?.protein) atom.updateVisual();
    }

    for (const bond of this.bonds) bond.markStyleDirty();
  }

  /** @param {import('./Molecule.js').Molecule[]} component */
  _orderProteinChain(component, adj) {
    const degree = (m) =>
      (adj.get(m) ?? []).filter((n) => component.includes(n.mol)).length;
    const endpoint = component.find((m) => degree(m) === 1) ?? component[0];

    const visited = new Set();
    const order = [];
    let current = endpoint;

    while (current && !visited.has(current)) {
      visited.add(current);
      order.push(current);
      const next = (adj.get(current) ?? []).find(
        (n) => component.includes(n.mol) && !visited.has(n.mol),
      );
      current = next ? next.mol : null;
    }
    return order;
  }

  /** @param {import('./Molecule.js').Molecule[]} ordered */
  _extractProteinConnectors(ordered, adj) {
    return ordered.slice(0, -1).map((mol, i) => {
      const link = (adj.get(mol) ?? []).find((n) => n.mol === ordered[i + 1]);
      return link ? link.connector : null;
    });
  }

  _updateMoleculesOnBond(a, b) {
    const molA = a.molecule;
    const molB = b.molecule;

    if (!molA && !molB) {
      this.molecules.push(new Molecule([a, b], this));
      return;
    }
    if (molA && !molB) {
      molA.addAtom(b);
      return;
    }
    if (!molA && molB) {
      molB.addAtom(a);
      return;
    }
    if (molA !== molB) {
      molA.merge(molB);
      this.molecules = this.molecules.filter((m) => m !== molB);
      this._breakConnectorBondsAfterMerge(molA, molB);
      return;
    }
    molA.recalculateProperties();
  }
}
