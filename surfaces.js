const { screen } = require('electron');

/**
 * Surface:
 * Physical ledge abstraction representing a walkable surface in the desktop world.
 */
class Surface {
  constructor({
    id,
    type, // 'taskbar' | 'window_edge' | 'app_shelf' | 'screen_edge'
    label,
    bounds, // { x, y, width, height }
    walkableRange, // { minX, maxX }
    elevation, // Y coordinate of the walkable foot ledge in screen coordinates
    isHome = false,
    defaultX = null,
    leftBoundaryType = 'screen_border', // 'screen_border' | 'drop_off' | 'wall'
    rightBoundaryType = 'screen_border', // 'screen_border' | 'drop_off' | 'wall'
    friction = 1.0
  }) {
    this.id = id;
    this.type = type;
    this.label = label || id;
    this.bounds = bounds || { x: 0, y: elevation, width: 800, height: 30 };
    this.walkableRange = walkableRange || { minX: this.bounds.x, maxX: this.bounds.x + this.bounds.width };
    this.elevation = elevation;
    this.isHome = isHome;
    this.defaultX = defaultX ?? Math.round((this.walkableRange.minX + this.walkableRange.maxX) / 2);
    this.leftBoundaryType = leftBoundaryType;
    this.rightBoundaryType = rightBoundaryType;
    this.friction = friction;
  }

  containsX(x) {
    return x >= this.walkableRange.minX && x <= this.walkableRange.maxX;
  }

  clampX(x) {
    return Math.max(this.walkableRange.minX, Math.min(this.walkableRange.maxX, Math.round(x)));
  }

  getEdgeMetrics(x) {
    const minX = this.walkableRange.minX;
    const maxX = this.walkableRange.maxX;
    const distLeft = x - minX;
    const distRight = maxX - x;
    return {
      distLeft,
      distRight,
      minDist: Math.min(distLeft, distRight),
      nearestEdge: distLeft <= distRight ? 'left' : 'right',
      atLeftLedge: distLeft <= 25 && this.leftBoundaryType === 'drop_off',
      atRightLedge: distRight <= 25 && this.rightBoundaryType === 'drop_off',
      atLeftWall: distLeft <= 5 && this.leftBoundaryType !== 'drop_off',
      atRightWall: distRight <= 5 && this.rightBoundaryType !== 'drop_off'
    };
  }

  toWorldCoords(localX) {
    return {
      worldX: Math.round(localX),
      worldY: this.elevation
    };
  }
}

/**
 * SurfaceManager:
 * Registry, spatial index, raycaster, and topological graph of desktop physical surfaces.
 */
class SurfaceManager {
  constructor() {
    this.surfaces = new Map();
    this.activeSurfaceId = 'taskbar-main';
  }

  registerSurface(surface) {
    if (!surface || !surface.id) return null;
    const instance = surface instanceof Surface ? surface : new Surface(surface);
    this.surfaces.set(instance.id, instance);
    return instance;
  }

  unregisterSurface(id) {
    return this.surfaces.delete(id);
  }

  getSurface(id) {
    return this.surfaces.get(id) || null;
  }

  getActiveSurface() {
    return this.getSurface(this.activeSurfaceId) || this.getHomeSurface();
  }

  setActiveSurface(id) {
    if (this.surfaces.has(id)) {
      this.activeSurfaceId = id;
      return true;
    }
    return false;
  }

  getHomeSurface() {
    for (const surface of this.surfaces.values()) {
      if (surface.isHome) return surface;
    }
    return this.surfaces.get('taskbar-main') || null;
  }

  getAllSurfaces() {
    return Array.from(this.surfaces.values());
  }

  // 1. Raycasting Downward (find highest surface directly beneath x, y)
  findSurfaceBelow(x, y) {
    let bestSurface = null;
    let highestElevationBelow = Infinity;

    for (const surface of this.surfaces.values()) {
      if (surface.elevation >= y - 1 && surface.containsX(x)) {
        if (surface.elevation < highestElevationBelow) {
          highestElevationBelow = surface.elevation;
          bestSurface = surface;
        }
      }
    }
    return bestSurface;
  }

  // 2. Raycasting Upward (find lowest surface directly above x, y within maxReach)
  findSurfaceAbove(x, y, maxReach = 350) {
    let bestSurface = null;
    let lowestElevationAbove = -Infinity;

    for (const surface of this.surfaces.values()) {
      if (surface.elevation < y && surface.elevation >= (y - maxReach) && surface.containsX(x)) {
        if (surface.elevation > lowestElevationAbove) {
          lowestElevationAbove = surface.elevation;
          bestSurface = surface;
        }
      }
    }
    return bestSurface;
  }

  // 3. Reachable Surfaces Query
  // jumpLimits: { maxJumpHeight: 180, maxJumpReach: 150, maxDropHeight: 600 }
  getReachableSurfaces(fromSurfaceId, currentX, jumpLimits = { maxJumpHeight: 180, maxJumpReach: 150, maxDropHeight: 600 }) {
    const currentSurface = this.getSurface(fromSurfaceId);
    if (!currentSurface) return [];

    const reachable = [];
    const fromElevation = currentSurface.elevation;

    for (const target of this.surfaces.values()) {
      if (target.id === fromSurfaceId) continue;

      const deltaY = fromElevation - target.elevation; // Positive = target is higher (jump up), Negative = target is lower (drop down)
      
      const isUp = deltaY > 0;
      if (isUp && deltaY > jumpLimits.maxJumpHeight) continue;
      if (!isUp && Math.abs(deltaY) > jumpLimits.maxDropHeight) continue;

      let horizontalDist = 0;
      if (currentX < target.walkableRange.minX) {
        horizontalDist = target.walkableRange.minX - currentX;
      } else if (currentX > target.walkableRange.maxX) {
        horizontalDist = currentX - target.walkableRange.maxX;
      } else {
        horizontalDist = 0; // Directly overlapping range
      }

      if (horizontalDist <= jumpLimits.maxJumpReach) {
        reachable.push({
          surfaceId: target.id,
          surface: target,
          deltaY,
          horizontalDist,
          transitionType: isUp ? 'jump_up' : (horizontalDist === 0 ? 'drop_down' : 'hop_down'),
          targetLandingX: target.clampX(currentX)
        });
      }
    }

    return reachable.sort((a, b) => (Math.abs(a.deltaY) + a.horizontalDist) - (Math.abs(b.deltaY) + b.horizontalDist));
  }

  // 4. Multi-Surface Navigation Path (Breadth-First Search on Surface Graph)
  findNavigationPath(fromSurfaceId, fromX, targetSurfaceId, targetX, jumpLimits = { maxJumpHeight: 180, maxJumpReach: 150, maxDropHeight: 600 }) {
    if (fromSurfaceId === targetSurfaceId) {
      return [{
        type: 'walk',
        surfaceId: fromSurfaceId,
        fromX,
        toX: targetX
      }];
    }

    const queue = [[fromSurfaceId, []]];
    const visited = new Set([fromSurfaceId]);

    while (queue.length > 0) {
      const [currentId, path] = queue.shift();
      const currentSurf = this.getSurface(currentId);
      const estX = path.length === 0 ? fromX : currentSurf.defaultX;
      const neighbors = this.getReachableSurfaces(currentId, estX, jumpLimits);

      for (const edge of neighbors) {
        const nextId = edge.surface.id;
        const newPath = [...path, {
          fromSurfaceId: currentId,
          toSurfaceId: nextId,
          transitionType: edge.transitionType,
          deltaY: edge.deltaY,
          landingX: edge.targetLandingX
        }];

        if (nextId === targetSurfaceId) {
          return newPath;
        }

        if (!visited.has(nextId)) {
          visited.add(nextId);
          queue.push([nextId, newPath]);
        }
      }
    }

    return null; // Unreachable
  }

  initPrimaryDisplaySurfaces() {
    const display = screen.getPrimaryDisplay();
    const { bounds, workArea } = display;

    // Detect taskbar top edge in desktop screen coordinates
    let ledgeY = workArea.y + workArea.height;
    let isBottom = true;

    if (workArea.y > bounds.y) {
      ledgeY = workArea.y;
      isBottom = false;
    }

    const PICO_WIDTH = 38;
    const minX = 0;
    const maxX = Math.max(0, workArea.width - PICO_WIDTH);

    const taskbarSurface = new Surface({
      id: 'taskbar-main',
      type: 'taskbar',
      label: 'Windows Taskbar',
      bounds: {
        x: workArea.x,
        y: ledgeY,
        width: workArea.width,
        height: bounds.height - workArea.height
      },
      walkableRange: {
        minX,
        maxX
      },
      elevation: ledgeY,
      isHome: true,
      defaultX: Math.round(workArea.width * 0.78),
      leftBoundaryType: 'screen_border',
      rightBoundaryType: 'screen_border'
    });

    this.registerSurface(taskbarSurface);
    this.activeSurfaceId = 'taskbar-main';
    return taskbarSurface;
  }

  initLiveElevatedShelf() {
    const display = screen.getPrimaryDisplay();
    const { bounds, workArea } = display;
    let ledgeY = workArea.y + workArea.height;
    if (workArea.y > bounds.y) {
      ledgeY = workArea.y;
    }

    const PICO_WIDTH = 38;
    const shelfWidth = Math.min(360, Math.max(260, Math.round(workArea.width * 0.28)));
    const gap = 80; // 80px horizontal gap between Ledge A and Ledge B (well within maxJumpReach: 150px)
    const shelfAX = Math.round(workArea.width * 0.18);
    const shelfBX = shelfAX + shelfWidth + gap;

    // Ledge A: primary elevated test shelf (id: elevated-test-shelf for backwards compatibility)
    const testShelfA = new Surface({
      id: 'elevated-test-shelf',
      type: 'app_shelf',
      label: 'Test Ledge A',
      bounds: {
        x: shelfAX,
        y: ledgeY - 110,
        width: shelfWidth,
        height: 24
      },
      walkableRange: {
        minX: shelfAX,
        maxX: shelfAX + shelfWidth - PICO_WIDTH
      },
      elevation: ledgeY - 110,
      isHome: false,
      defaultX: Math.round(shelfAX + shelfWidth / 2),
      leftBoundaryType: 'drop_off',
      rightBoundaryType: 'drop_off'
    });

    // Ledge B: adjacent reachable shelf at similar elevation for multi-ledge traversal
    const testShelfB = new Surface({
      id: 'test-shelf-b',
      type: 'app_shelf',
      label: 'Test Ledge B',
      bounds: {
        x: shelfBX,
        y: ledgeY - 120,
        width: shelfWidth,
        height: 24
      },
      walkableRange: {
        minX: shelfBX,
        maxX: shelfBX + shelfWidth - PICO_WIDTH
      },
      elevation: ledgeY - 120,
      isHome: false,
      defaultX: Math.round(shelfBX + shelfWidth / 2),
      leftBoundaryType: 'drop_off',
      rightBoundaryType: 'drop_off'
    });

    this.registerSurface(testShelfA);
    this.registerSurface(testShelfB);
    return testShelfA;
  }

  initTestSurfaces() {
    return this.initLiveElevatedShelf();
  }
}

/**
 * TaskbarWorldSurface:
 * Backwards compatibility helper for existing test suites.
 */
class TaskbarWorldSurface {
  static getSurface() {
    const display = screen.getPrimaryDisplay();
    const { bounds, workArea } = display;
    let ledgeY = workArea.y + workArea.height;
    let isBottom = true;

    if (workArea.y > bounds.y) {
      ledgeY = workArea.y;
      isBottom = false;
    }

    const PICO_WIDTH = 38;
    const minX = 0;
    const maxX = Math.max(0, workArea.width - PICO_WIDTH);

    return {
      ledgeY,
      isBottom,
      leftBound: workArea.x,
      rightBound: workArea.x + workArea.width,
      bounds,
      workArea,
      minX,
      maxX,
      defaultX: Math.round(workArea.width * 0.78)
    };
  }
}

module.exports = { Surface, SurfaceManager, TaskbarWorldSurface };
