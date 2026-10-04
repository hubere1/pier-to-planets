/** Einfacher Regal-Packer für Atlanten ≤ 2048 × 2048 (docs/04 § Asset-Pipeline). */
export interface Size {
  w: number;
  h: number;
}
export interface Box extends Size {
  x: number;
  y: number;
}

/** Packt nach Höhe sortiert in Regale; Ergebnis in Eingabe-Reihenfolge. */
export function packShelves(
  sizes: readonly Size[],
  maxWidth: number,
  padding: number,
): { boxes: Box[]; width: number; height: number } {
  const order = sizes.map((s, i) => ({ ...s, i })).sort((a, b) => b.h - a.h || b.w - a.w);
  const boxes = new Array<Box>(sizes.length);
  let x = padding;
  let y = padding;
  let shelf = 0;
  let width = 0;
  for (const s of order) {
    if (s.w + 2 * padding > maxWidth)
      throw new Error(`Sprite ${s.w}px breiter als Atlas ${maxWidth}px`);
    if (x + s.w + padding > maxWidth) {
      x = padding;
      y += shelf + padding;
      shelf = 0;
    }
    boxes[s.i] = { x, y, w: s.w, h: s.h };
    x += s.w + padding;
    shelf = Math.max(shelf, s.h);
    width = Math.max(width, x);
  }
  return { boxes, width, height: y + shelf + padding };
}
