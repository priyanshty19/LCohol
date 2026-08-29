export type JamesPosition = { x: number; y: number };

export const JAMES_LAUNCHER_SIZE = 64;
const SCREEN_EDGE_GAP = 8;

export function clampJamesPosition(
  position: JamesPosition,
  viewportWidth: number,
  viewportHeight: number,
  launcherSize = JAMES_LAUNCHER_SIZE,
): JamesPosition {
  const maxX = Math.max(SCREEN_EDGE_GAP, viewportWidth - launcherSize - SCREEN_EDGE_GAP);
  const maxY = Math.max(SCREEN_EDGE_GAP, viewportHeight - launcherSize - SCREEN_EDGE_GAP);
  return {
    x: Math.min(Math.max(position.x, SCREEN_EDGE_GAP), maxX),
    y: Math.min(Math.max(position.y, SCREEN_EDGE_GAP), maxY),
  };
}
