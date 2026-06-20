// ============================================================
// ASCII Chemistry — utils.js
// Funciones reutilizables puras (sin dependencias de Pixi/Matter)
// ============================================================

/** Cuadrado de la distancia euclídea (sin sqrt). */
export function distanceSquared(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

/** Distancia euclídea entre dos puntos. */
export function distance(x1, y1, x2, y2) {
  return Math.sqrt(distanceSquared(x1, y1, x2, y2));
}

/** Dirección unitaria a partir de deltas ya calculados. */
export function directionFromDelta(dx, dy) {
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: dx / len, y: dy / len };
}

/** Dirección normalizada de (fromX, fromY) hacia (toX, toY). */
export function direction(fromX, fromY, toX, toY) {
  return directionFromDelta(toX - fromX, toY - fromY);
}
