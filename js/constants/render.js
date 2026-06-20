// ============================================================
// ASCII Chemistry — render constants
// ============================================================

// ── Paleta pastel ─────────────────────────────────────────────
/** Colores pastel cíclicos asignados por id de entidad. */
export const PASTEL_PALETTE = [
  0xf8b4b4, // coral
  0xfcd5a0, // melocotón
  0xfaf0a8, // vainilla
  0xc8ebb8, // menta
  0xa8d4f0, // cielo
  0xc9b8f8, // lavanda
  0xf8c0d8, // rosa
  0xb8ead8, // agua
  0xffd4b8, // albaricoque
  0xe0c8f0, // lila
  0xb0e8d0, // salvia
  0xffc0cb, // cereza
];

/** @param {number} id */
export function colorIndexFromId(id) {
  return ((id % PASTEL_PALETTE.length) + PASTEL_PALETTE.length) % PASTEL_PALETTE.length;
}

/** @param {number} id */
export function colorFromId(id) {
  return PASTEL_PALETTE[colorIndexFromId(id)];
}

// ── Colores por tipo (0–9) ────────────────────────────────────
/** Colores pastel por tipo de molécula (inert → extreme). */
export const MOLECULE_TYPE_PALETTE = [
  0xa8d4f0, // inert
  0xc8ebb8, // stable
  0xfaf0a8, // mild
  0xfcd5a0, // reactive
  0xf8b4b4, // volatile
  0xc9b8f8, // complex
  0xb0e8d0, // ordered
  0xf8c0d8, // symmetric
  0xffd4b8, // dense
  0xe0c8f0, // extreme
];

/** Colores más saturados por tipo de proteína (inert → extreme). */
export const PROTEIN_TYPE_PALETTE = [
  0x5a8fd4, // inert
  0x4a9e6e, // stable
  0xc4a832, // mild
  0xd4843a, // reactive
  0xd45a5a, // volatile
  0x7a5ad4, // complex
  0x3a9e88, // ordered
  0xd45a9e, // symmetric
  0xd4923a, // dense
  0x9a5ad4, // extreme
];

/** @param {number} type */
export function colorFromMoleculeType(type) {
  const t = Math.max(0, Math.min(MOLECULE_TYPE_PALETTE.length - 1, type | 0));
  return MOLECULE_TYPE_PALETTE[t];
}

/** @param {number} type */
export function colorFromProteinType(type) {
  const t = Math.max(0, Math.min(PROTEIN_TYPE_PALETTE.length - 1, type | 0));
  return PROTEIN_TYPE_PALETTE[t];
}

// ── Relleno de átomos ─────────────────────────────────────────
/** Color de átomos libres (no pertenecen a una molécula). */
export const ATOM_FILL_NORMAL = 0x6eb5ff;
/** Color de átomos conector (intermoleculares). */
export const ATOM_FILL_CONNECTOR = 0xff8a6a;
/** Opacidad del relleno del círculo del átomo. */
export const ATOM_FILL_ALPHA = 0.9;

// ── Borde de átomo ────────────────────────────────────────────
/** Grosor del borde de átomos fuera de proteína. */
export const ATOM_STROKE_WIDTH = 1;
/** Opacidad del borde de átomos fuera de proteína. */
export const ATOM_STROKE_ALPHA = 0.3;
/** Grosor del borde cuando el átomo pertenece a una proteína. */
export const PROTEIN_STROKE_WIDTH = 3;
/** Opacidad del borde de proteína. */
export const PROTEIN_STROKE_ALPHA = 0.95;

// ── Cámara ──────────────────────────────────────────────────
/** Zoom mínimo (alejado). */
export const ZOOM_MIN = 0.25;
/** Zoom máximo (cercano). */
export const ZOOM_MAX = 4;
/** Factor multiplicativo por notch de rueda del mouse. */
export const ZOOM_WHEEL_FACTOR = 1.1;

// ── Límites del mundo (visual) ────────────────────────────────
/** Color del borde del rectángulo de límites del mundo. */
export const WORLD_BOUNDS_BORDER_COLOR = 0xffffff;
/** Grosor del trazo del borde de límites. */
export const WORLD_BOUNDS_BORDER_WIDTH = 5;
/** Color del oscurecimiento fuera del mundo. */
export const WORLD_BOUNDS_OUTSIDE_DIM_COLOR = 0x000000;
/** Opacidad del oscurecimiento fuera del mundo. */
export const WORLD_BOUNDS_OUTSIDE_DIM_ALPHA = 0.65;
/** Color de la franja de “pared” en el borde del mundo. */
export const WORLD_WALL_VISUAL_COLOR = 0xff5533;
/** Opacidad de la franja de pared. */
export const WORLD_WALL_VISUAL_ALPHA = 0.35;
/** Ancho de la franja visible en el borde del mundo (px mundo). */
export const WORLD_WALL_VISUAL_BAND = 120;

// ── Bonds ─────────────────────────────────────────────────────
/** Color de las líneas de enlace. */
export const BOND_LINE_COLOR = 0x88ffaa;
/** Grosor de las líneas de enlace. */
export const BOND_LINE_WIDTH = 3;
/** Opacidad de las líneas de enlace. */
export const BOND_LINE_ALPHA = 1;

// ── HUD ───────────────────────────────────────────────────────
/** Color del texto del contador de FPS. */
export const FPS_HUD_FILL = 0xaaccff;
/** Tamaño de fuente del HUD de FPS. */
export const FPS_HUD_FONT_SIZE = 14;
/** Margen horizontal del HUD de FPS. */
export const FPS_HUD_PADDING_X = 12;
/** Margen vertical del HUD de FPS. */
export const FPS_HUD_PADDING_Y = 8;

// ── Polaridad (indicador dentro del átomo) ────────────────────
/** Color del texto de polaridad dibujado sobre el átomo. */
export const POLARITY_TEXT_FILL = 0xffffff;
/** Opacidad del indicador de polaridad. */
export const POLARITY_TEXT_ALPHA = 0.95;
