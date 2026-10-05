/**
 * Parallax-Kamera (docs/06 §6): horizontaler Schwenk per Wischen, mit Auslaufen.
 * Position intern als Kommazahl, jede Ebene rundet einzeln auf ganze Spiel-Pixel (docs/06 §3).
 * Rein kosmetisch – kein Spielzustand.
 */

/** Ebenen-Faktoren laut Tabelle docs/06 §6 (Himmel 0 liegt im Shader, Wasser = Spiel). */
export const PARALLAX = { far: 0.1, mid: 0.3, game: 1, front: 1.3 } as const;

/** Schwenkbereich in Spiel-Pixeln links und rechts der Mitte (D-029; Hafen mit 8 Gebäuden: D-037). */
export const CAM_RANGE = 120;
/** Gleiten bei `focus`: Anteil der Reststrecke je Sekunde. */
const FOCUS_RATE = 4;

/** Reibung des Auslaufens: Anteil der Geschwindigkeit, der pro Sekunde übrig bleibt. */
const FRICTION = 0.02;
const MIN_SPEED = 2;

export const layerOffset = (camX: number, factor: number): number =>
  -Math.round(camX * factor) || 0;

const clamp = (v: number) => Math.max(-CAM_RANGE, Math.min(CAM_RANGE, v));

export class Camera {
  x = 0;
  /** „Animationen reduzieren“ (NFR-Q03): kein Auslaufen, Kamera folgt nur dem Finger. */
  reducedMotion = false;
  private velocity = 0;
  private dragging = false;
  private dragDelta = 0;
  private target: number | null = null;

  jumpTo(x: number): void {
    this.x = clamp(x);
    this.velocity = 0;
    this.target = null;
  }

  /** Schwenkt zu `x` (gewähltes Gebäude bleibt sichtbar, docs/05 § Szene). */
  focus(x: number): void {
    if (this.reducedMotion) {
      this.jumpTo(x);
      return;
    }
    this.target = clamp(x);
    this.velocity = 0;
  }

  beginDrag(): void {
    this.target = null;
    this.dragging = true;
    this.velocity = 0;
    this.dragDelta = 0;
  }

  /** Fingerbewegung in Spiel-Pixeln (positiv = nach rechts). Inhalt folgt dem Finger. */
  dragBy(dx: number): void {
    this.x = clamp(this.x - dx);
    this.dragDelta -= dx;
  }

  endDrag(): void {
    this.dragging = false;
    if (this.reducedMotion) this.velocity = 0;
  }

  update(dt: number): void {
    if (dt <= 0) return;
    if (this.dragging) {
      // Geglättete Fingergeschwindigkeit für das Auslaufen nach dem Loslassen.
      this.velocity = this.velocity * 0.6 + (this.dragDelta / dt) * 0.4;
      this.dragDelta = 0;
      return;
    }
    if (this.target !== null) {
      const d = this.target - this.x;
      if (Math.abs(d) < 0.5) {
        this.x = this.target;
        this.target = null;
      } else this.x += d * Math.min(1, FOCUS_RATE * dt);
      return;
    }
    if (this.velocity === 0) return;
    this.x = clamp(this.x + this.velocity * dt);
    this.velocity *= Math.pow(FRICTION, dt);
    if (Math.abs(this.velocity) < MIN_SPEED || Math.abs(this.x) === CAM_RANGE) this.velocity = 0;
  }
}
