import { describe, expect, it } from 'vitest';
import { Camera, CAM_RANGE, layerOffset, PARALLAX } from './camera.ts';

describe('Parallax-Faktoren (docs/06 §6)', () => {
  it('entsprechen der Ebenen-Tabelle', () => {
    expect(PARALLAX).toEqual({ far: 0.1, mid: 0.3, game: 1, front: 1.3 });
  });

  it('jede Ebene rundet einzeln auf ganze Spiel-Pixel', () => {
    for (const x of [-40, -13.7, -0.4, 0, 0.6, 7.25, 33.3, 40]) {
      for (const f of Object.values(PARALLAX)) {
        expect(Number.isInteger(layerOffset(x, f))).toBe(true);
      }
    }
    expect(layerOffset(10, 0.3)).toBe(-3);
    expect(layerOffset(10, 1.3)).toBe(-13);
    expect(layerOffset(0, 1.3)).toBe(0);
  });
});

describe('Camera', () => {
  it('startet in der Mitte und bleibt im erlaubten Bereich', () => {
    const c = new Camera();
    expect(c.x).toBe(0);
    c.dragBy(-500);
    c.update(0.016);
    expect(c.x).toBe(CAM_RANGE);
    c.dragBy(1000);
    expect(c.x).toBe(-CAM_RANGE);
  });

  it('Wischen nach links schiebt die Kamera nach rechts (Inhalt folgt dem Finger)', () => {
    const c = new Camera();
    c.dragBy(-12);
    expect(c.x).toBe(12);
  });

  it('läuft nach dem Loslassen aus und kommt zur Ruhe', () => {
    const c = new Camera();
    c.beginDrag();
    for (let i = 0; i < 5; i++) {
      c.dragBy(-2);
      c.update(1 / 60);
    }
    const released = c.x;
    c.endDrag();
    c.update(1 / 60);
    expect(c.x).toBeGreaterThan(released);
    for (let i = 0; i < 600; i++) c.update(1 / 60);
    const rest = c.x;
    c.update(1 / 60);
    expect(c.x).toBe(rest);
    expect(Math.abs(rest)).toBeLessThanOrEqual(CAM_RANGE);
  });

  it('ohne Auslaufen („Animationen reduzieren“) stoppt sie sofort', () => {
    const c = new Camera();
    c.reducedMotion = true;
    c.beginDrag();
    c.dragBy(-6);
    c.update(1 / 60);
    c.endDrag();
    const x = c.x;
    c.update(1 / 60);
    expect(c.x).toBe(x);
  });

  it('jumpTo setzt die Position direkt (Debug, URL-Parameter)', () => {
    const c = new Camera();
    c.jumpTo(25);
    expect(c.x).toBe(25);
    c.jumpTo(999);
    expect(c.x).toBe(CAM_RANGE);
  });

  it('focus gleitet zum Ziel; mit „Animationen reduzieren“ springt sie', () => {
    const c = new Camera();
    c.focus(80);
    c.update(0.1);
    expect(c.x).toBeGreaterThan(0);
    expect(c.x).toBeLessThan(80);
    for (let i = 0; i < 60; i++) c.update(1 / 30);
    expect(c.x).toBeCloseTo(80, 0);
    const r = new Camera();
    r.reducedMotion = true;
    r.focus(-60);
    expect(r.x).toBe(-60);
  });

  it('Wischen bricht ein laufendes focus ab', () => {
    const c = new Camera();
    c.focus(100);
    c.beginDrag();
    c.update(0.1);
    c.endDrag();
    const x = c.x;
    c.update(0.5);
    expect(c.x).toBe(x);
  });
});
