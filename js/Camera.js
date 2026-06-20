// ============================================================
// ASCII Chemistry — Camera.js
// ============================================================
import { ZOOM_MIN, ZOOM_MAX } from "./constants/render.js";

export class Camera {
  /**
   * @param {import('pixi.js').Container} worldContainer
   */
  constructor(worldContainer) {
    this.worldContainer = worldContainer;
    this.x = 0;
    this.y = 0;
    this.zoom = 1;
  }

  apply() {
    this.worldContainer.position.set(this.x, this.y);
    this.worldContainer.scale.set(this.zoom);
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.x) / this.zoom,
      y: (sy - this.y) / this.zoom,
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: wx * this.zoom + this.x,
      y: wy * this.zoom + this.y,
    };
  }

  panBy(dx, dy) {
    this.x += dx;
    this.y += dy;
    this.apply();
  }

  zoomAt(screenX, screenY, factor) {
    const worldX = (screenX - this.x) / this.zoom;
    const worldY = (screenY - this.y) / this.zoom;
    this.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.zoom * factor));
    this.x = screenX - worldX * this.zoom;
    this.y = screenY - worldY * this.zoom;
    this.apply();
  }

  centerOn(worldX, worldY, viewW, viewH) {
    this.x = viewW / 2 - worldX * this.zoom;
    this.y = viewH / 2 - worldY * this.zoom;
    this.apply();
  }

  clampPan(worldW, worldH, viewW, viewH) {
    const scaledW = worldW * this.zoom;
    const scaledH = worldH * this.zoom;

    if (scaledW <= viewW) {
      this.x = (viewW - scaledW) / 2;
    } else {
      this.x = Math.min(0, Math.max(viewW - scaledW, this.x));
    }

    if (scaledH <= viewH) {
      this.y = (viewH - scaledH) / 2;
    } else {
      this.y = Math.min(0, Math.max(viewH - scaledH, this.y));
    }

    this.apply();
  }

  /** @param {number} viewW @param {number} viewH */
  getWorldBounds(viewW, viewH) {
    return {
      left: -this.x / this.zoom,
      top: -this.y / this.zoom,
      right: (-this.x + viewW) / this.zoom,
      bottom: (-this.y + viewH) / this.zoom,
    };
  }
}
