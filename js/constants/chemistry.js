// ============================================================
// ASCII Chemistry — chemistry constants
// ============================================================

// El valor ASCII de cada átomo es su superficie en px²; radio = sqrt(area / π)
// masa = superficie × multiplicador (px² no mapean bien directo a Matter.js)
/** Escala de masa y radio respecto al área ASCII del carácter. */
export const ATOM_SIZE_MULTIPLIER = 10;

// ── Polaridad (fórmula sobre código ASCII) ────────────────────
// ASCII ≤ INERT_ASCII_MAX: inertes (sin polaridad, no extraíbles en ladder)
/** Código ASCII máximo considerado inerte (control chars, sin polaridad). */
export const INERT_ASCII_MAX = 31;
/** Alias de INERT_ASCII_MAX: polaridad forzada a 0 por debajo de este umbral. */
export const POLARITY_CONTROL_MAX = INERT_ASCII_MAX;
/** Multiplicador del código ASCII dentro de sin() para generar polaridad. */
export const POLARITY_ASCII_MULTIPLIER = 100;
/** Umbral mínimo de |polaridad| para considerar transferencia significativa. */
export const POLARITY_EPS = 0.02;
/** Polaridad de conectores = polaridad del carácter × este factor. */
export const CONNECTOR_POLARITY_FACTOR = 0.1;

/**
 * @param {number} code — charCodeAt(0)
 * @param {boolean} [isConnector]
 * @returns {number} en [-1, 1]
 */
export function calcPolarityFromAscii(code, isConnector = false) {
  if (code <= POLARITY_CONTROL_MAX) return 0;
  const p = Math.sin(code * POLARITY_ASCII_MULTIPLIER);
  return isConnector ? p * CONNECTOR_POLARITY_FACTOR : p;
}

/** Transferencia mínima de polaridad por enlace en cada tick químico. */
export const MIN_BOND_TRANSFER = 0.005;
/** Intensidad de la fuerza de atracción/repulsión entre átomos polarizados. */
export const POLARITY_FORCE_STRENGTH = 10000;
/** Distancia mínima al aplicar fuerzas de polaridad (evita singularidad). */
export const POLARITY_FORCE_MIN_DIST = 8;
/** Radio máximo (px mundo) para aplicar fuerzas de polaridad entre átomos. */
export const POLARITY_FORCE_RADIUS = 240;

/** Máximo de enlaces activos por átomo conector (intermolecular). */
export const CONNECTOR_MAX_CONNECTIONS = 2;

// ── Enlaces ─────────────────────────────────────────────────
/** Distancia máxima para crear un enlace = radioA + radioB × este factor. */
export const BOND_DISTANCE_FACTOR = 1.5;
/** Rigidez del constraint de distancia en PhysicsWorld (0 = blando, 1 = rígido). */
export const BOND_STIFFNESS = 0.05;
/** Amortiguación del enlace en PhysicsWorld. */
export const BOND_DAMPING = 0.1;

// Enlaces conector ↔ átomo (intermoleculares)
/** Longitud de reposo del enlace conector = (radioA + radioB) × este factor. */
export const CONNECTOR_LENGTH_FACTOR = 1;
/** Rigidez de enlaces conector–átomo (más blando que enlaces intramoleculares). */
export const CONNECTOR_STIFFNESS = 0.01;

// ── Ruptura por estiramiento ─────────────────────────────────
/**
 * Multiplicador global de fragilidad. 1 = umbral dado solo por polarityTransfer
 * del enlace; 2 = el doble de frágil (rompe con la mitad de estiramiento).
 */
export const BOND_BREAK_FRAGILITY = 1;

// ── Loop químico ────────────────────────────────────────────
/** Intervalo del tick de química (ms): enlaces, polaridad, comportamientos. */
export const CHEMISTRY_TICK_MS = 50;

/** Tamaño de celda del spatial hash (~ (2 × maxRadius) × BOND_DISTANCE_FACTOR). */
export const SPATIAL_HASH_CELL_SIZE = 80;

// ── Comportamientos moleculares ───────────────────────────────
/** Fuerza de empuje aplicada por el comportamiento Mover. */
export const MOVER_FORCE = 0.0005;
/** Intensidad de la fuerza de separación entre moléculas cercanas. */
export const SEPARATION_STRENGTH = 1200;
/** Radio de influencia del comportamiento de separación. */
export const SEPARATION_RADIUS = 250;
/** Distancia mínima al calcular separación (evita singularidad). */
export const SEPARATION_MIN_DIST = 8;
