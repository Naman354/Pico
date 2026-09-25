const { screen } = require('electron');

/**
 * Surface:
 * Physical ledge abstraction representing a walkable surface in the desktop world.
 */
class Surface {
  constructor({ id, type, label, bounds, walkableRange, elevation, isHome = false, defaultX = null }) {
    this.id = id;
    this.type = type; // 'taskbar' | 'window_edge' | 'screen_edge'
    this.label = label;
    this.bounds = bounds; // { x, y, width, height }
    this.walkableRange = walkableRange; // { minX, maxX }
    this.elevation = elevation; // Y coordinate of the walkable foot ledge in screen coordinates
    this.isHome = isHome;
    this.defaultX = defaultX;
  }
}

/**
 * SurfaceManager:
 * Registry and coordinator of desktop physical surfaces.
 */
class SurfaceManager {
  constructor() {
    this.surfaces = new Map();
    this.activeSurfaceId = 'taskbar-main';
  }

  registerSurface(surface) {
    this.surfaces.set(surface.id, surface);
    return surface;
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
        minX: workArea.x + 30,
        maxX: workArea.x + workArea.width - 280
      },
      elevation: ledgeY,
      isHome: true,
      defaultX: workArea.x + workArea.width - 320
    });

    this.registerSurface(taskbarSurface);
    this.activeSurfaceId = 'taskbar-main';
    return taskbarSurface;
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

    return {
      ledgeY,
      isBottom,
      leftBound: workArea.x,
      rightBound: workArea.x + workArea.width,
      bounds,
      workArea,
      minX: workArea.x + 30,
      maxX: workArea.x + workArea.width - 280,
      defaultX: workArea.x + workArea.width - 320
    };
  }
}

module.exports = { Surface, SurfaceManager, TaskbarWorldSurface };
