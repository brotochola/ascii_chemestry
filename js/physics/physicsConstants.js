// ============================================================
// ASCII Chemistry — physics constants
// ============================================================

// ── Integración y solver ──────────────────────────────────────
/** Amortiguación lineal por frame: vel *= max(0, 1 − FRICTION_AIR × dt). */
export const FRICTION_AIR = 0.05;
/** Coeficiente de restitución en colisiones círculo–círculo (0 = inelástico, 1 = elástico). */
export const RESTITUTION = 0.3;
/** Pasadas del solver de posición por enlace (constraint de distancia blanda). */
export const POSITION_ITERATIONS = 1;
/** Pasadas de resolución de colisión por sub-paso y al final del step. */
export const COLLISION_ITERATIONS = 1;
/** Sub-pasos internos (colisiones + enlaces) dentro de cada step. */
export const SOLVER_SUBSTEPS = 1;

// ── Constraints de enlace ─────────────────────────────────────
/** Mezcla base de corrección posicional: alpha = min(1, stiffness × 8 + este valor). */
export const BOND_CORRECTION_ALPHA = 0.45;
/** Factor Baumgarte para estabilizar velocidad en constraints de distancia. */
export const CONSTRAINT_BAUMGARTE = 0.2;

// ── Capacidad inicial (SoA) ───────────────────────────────────
/** Tamaño inicial de los arrays de cuerpos antes del primer realloc. */
export const INITIAL_BODY_CAPACITY = 256;
/** Tamaño inicial del pool de enlaces antes del primer realloc. */
export const INITIAL_BOND_CAPACITY = 512;

// ── Separación suave (boids-style) ───────────────────────────
/** Fuerza de separación por unidad de overlap normalizado (overlap = 0..1). */
export const SEPARATION_FORCE_STRENGTH = 10000;
/**
 * Fracción de (r₁+r₂) usada como distancia de contacto.
 * 1.0 = sin overlap; 0.9 = ~10% de overlap visual permitido.
 */
export const SEPARATION_OVERLAP_FACTOR = 1;

// ── Límites del mundo (gameplay) ──────────────────────────────
/** Factor de rebote al chocar contra los bordes del mundo (AsciiChemistry). */
export const WORLD_CLAMP_BOUNCE = 0.35;
