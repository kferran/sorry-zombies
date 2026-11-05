/** Portrait only matters on touch screens; a tall desktop window plays normally. */
export function needsLandscape(width: number, height: number, coarsePointer: boolean): boolean {
  return coarsePointer && height > width;
}

export function viewportNeedsLandscape(): boolean {
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  return needsLandscape(window.innerWidth, window.innerHeight, coarse);
}
