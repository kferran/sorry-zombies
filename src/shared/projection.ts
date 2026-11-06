export type Point = { x: number; y: number };

/**
 * World point → screen point for a camera showing `view` (its worldView's top-left) at `zoom`,
 * whose viewport starts at `viewport` on screen. Pure, so it can be tested without Phaser.
 */
export function worldToScreen(p: Point, view: Point, zoom: number, viewport: Point = { x: 0, y: 0 }): Point {
  return { x: viewport.x + (p.x - view.x) * zoom, y: viewport.y + (p.y - view.y) * zoom };
}
