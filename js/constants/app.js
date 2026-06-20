// ============================================================
// ASCII Chemistry — app constants
// ============================================================

/** Ancho del mundo simulado (unidades de canvas / physics). */
export const WORLD_WIDTH = 5500;
/** Alto del mundo simulado. */
export const WORLD_HEIGHT = 5200;

/** Átomos creados al iniciar la simulación (0 = lienzo vacío). */
export const INITIAL_ATOM_COUNT = 100;

// ── Interacción (click) ───────────────────────────────────────
/** Intensidad de la repulsión al hacer click: fuerza ∝ strength / dist². */
export const REPULSE_STRENGTH = 80000;
/** Distancia mínima al calcular repulsión (evita singularidad en dist²). */
export const REPULSE_MIN_DIST = 8;
