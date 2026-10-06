// DOM Elements
const desktopStage = document.getElementById('desktop-stage');
const picoContainer = document.getElementById('pico-container');
const picoFacer = document.getElementById('pico-facer');
const picoFigure = document.getElementById('pico-figure');
const bubbleContainer = document.getElementById('bubble-container');
const picoInput = document.getElementById('pico-input');
const sendBtn = document.getElementById('send-btn');
const picoCharacter = document.getElementById('pico-character');
const picoHead = document.getElementById('pico-head');
const picoBody = document.getElementById('pico-body');
const picoEyesLeft = document.getElementById('pico-eyes-left');
const picoEyesRight = document.getElementById('pico-eyes-right');
const picoEyesDown = document.getElementById('pico-eyes-down');
const picoSideStand = document.getElementById('pico-side-stand');
const picoSideWalk1 = document.getElementById('pico-side-walk1');
const picoSideWalk2 = document.getElementById('pico-side-walk2');
const picoBlink = document.getElementById('pico-blink');

let isBubbleOpen = false;
let animationTimeout = null;

// Occasional Natural Idle Blink Controller
const IdleBlink = {
  timer: null,
  durationTimer: null,
  isBlinking: false,
  isPaused: false,

  start() {
    this.scheduleNext();
  },

  scheduleNext() {
    this.clearTimer();
    // Natural human irregular intervals: roughly 2.5s to 5.8s
    const intervalMs = Math.floor(2500 + Math.random() * 3300);
    this.timer = setTimeout(() => {
      this.blink();
    }, intervalMs);
  },

  blink() {
    if (this.isPaused || this.isBusy()) {
      this.scheduleNext();
      return;
    }

    this.isBlinking = true;
    picoContainer.classList.add('blinking');

    // Subtle, brief blink: normal human blink is ~120-140ms
    const blinkDurationMs = 130;
    this.durationTimer = setTimeout(() => {
      this.endBlink();

      // Occasional natural double-blink (15% probability)
      if (Math.random() < 0.15 && !this.isBusy() && !this.isPaused) {
        setTimeout(() => {
          if (!this.isBusy() && !this.isPaused) {
            picoContainer.classList.add('blinking');
            setTimeout(() => {
              this.endBlink();
              this.scheduleNext();
            }, 110);
          } else {
            this.scheduleNext();
          }
        }, 110);
      } else {
        this.scheduleNext();
      }
    }, blinkDurationMs);
  },

  blinkBriefly(durationMs = 120) {
    if (this.isPaused) return;
    this.endBlink();
    picoContainer.classList.add('blinking');
    this.durationTimer = setTimeout(() => {
      this.endBlink();
    }, durationMs);
  },

  endBlink() {
    this.isBlinking = false;
    picoContainer.classList.remove('blinking');
    if (this.durationTimer) {
      clearTimeout(this.durationTimer);
      this.durationTimer = null;
    }
  },

  isBusy() {
    const target = picoFigure || picoCharacter;
    if (!target) return false;
    return (
      target.classList.contains('reacting') ||
      target.classList.contains('acknowledging') ||
      target.classList.contains('walking') ||
      target.classList.contains('turning-to-side') ||
      target.classList.contains('turning-to-front') ||
      target.classList.contains('turning-around') ||
      (window.WanderController && (window.WanderController.isWalking || window.WanderController.isTurning)) ||
      (window.UserMovement && window.UserMovement.isMovingFromUser) ||
      isBubbleOpen
    );
  },

  // Immediately pause and cancel any active/pending blink during higher priority animations
  pauseAndOverride() {
    this.isPaused = true;
    this.endBlink();
    this.clearTimer();
  },

  resume() {
    this.isPaused = false;
    this.endBlink();
    this.scheduleNext();
  },

  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
};

// Expose on window for automated verification and test coverage
window.IdleBlink = IdleBlink;

// Autonomous Idle Attention Controller (Natural, subtle looks & posture shifts)
const IdleAttention = {
  timer: null,
  restoreTimer: null,
  currentState: 'forward', // 'forward', 'glance-left', 'glance-right', 'glance-down', 'turn-left', 'turn-right', 'head-tilt', 'weight-shift'
  isUserEngaged: false,

  start() {
    this.scheduleNext();
  },

  scheduleNext() {
    this.clearTimers();
    if (this.isUserEngaged || this.isBusy()) {
      return;
    }

    // Irregular interval between autonomous shifts: 3.5s to 7.5s of quiet resting
    const quietIntervalMs = Math.floor(3500 + Math.random() * 4000);
    this.timer = setTimeout(() => {
      this.performAttentionShift();
    }, quietIntervalMs);
  },

  performAttentionShift() {
    if (this.isUserEngaged || this.isBusy()) {
      this.resetToForward();
      this.scheduleNext();
      return;
    }

    // Probability breakdown:
    // Primary behavior: Eye movement alone (~50%)
    // Secondary behavior: Combined eye movement + slight head turn (~25%)
    // Other occasional behaviors: glance down (~12%), tiny head tilt (~8%), subtle weight shift (~5%)
    const roll = Math.random();
    let nextState = 'forward';
    let durationMs = 1800;

    if (roll < 0.26) {
      nextState = 'glance-left';
      durationMs = Math.floor(1400 + Math.random() * 1000);
    } else if (roll < 0.52) {
      nextState = 'glance-right';
      durationMs = Math.floor(1400 + Math.random() * 1000);
    } else if (roll < 0.65) {
      nextState = 'turn-left';
      durationMs = Math.floor(2000 + Math.random() * 1200);
    } else if (roll < 0.78) {
      nextState = 'turn-right';
      durationMs = Math.floor(2000 + Math.random() * 1200);
    } else if (roll < 0.88) {
      nextState = 'glance-down';
      durationMs = Math.floor(1200 + Math.random() * 800);
    } else if (roll < 0.95) {
      nextState = 'head-tilt';
      durationMs = Math.floor(1500 + Math.random() * 1000);
    } else {
      nextState = 'weight-shift';
      durationMs = Math.floor(2200 + Math.random() * 1200);
    }

    this.applyState(nextState);

    // Return naturally to neutral forward resting
    this.restoreTimer = setTimeout(() => {
      this.resetToForward();
      this.scheduleNext();
    }, durationMs);
  },

  applyState(state) {
    this.currentState = state;
    this.clearStateClasses();

    if (!picoFigure) return;

    switch (state) {
      case 'glance-left':
        picoFigure.classList.add('gaze-left');
        break;
      case 'glance-right':
        picoFigure.classList.add('gaze-right');
        break;
      case 'glance-down':
        picoFigure.classList.add('gaze-down', 'head-down');
        break;
      case 'turn-left':
        picoFigure.classList.add('gaze-left', 'head-turn-left');
        break;
      case 'turn-right':
        picoFigure.classList.add('gaze-right', 'head-turn-right');
        break;
      case 'head-tilt':
        picoFigure.classList.add('head-tilt');
        break;
      case 'weight-shift':
        picoFigure.classList.add('weight-shift');
        break;
      case 'forward':
      default:
        break;
    }
  },

  clearStateClasses() {
    if (!picoFigure) return;
    picoFigure.classList.remove(
      'gaze-left', 'gaze-right', 'gaze-down',
      'head-turn-left', 'head-turn-right', 'head-tilt', 'head-down',
      'weight-shift'
    );
  },

  resetToForward() {
    this.currentState = 'forward';
    this.clearStateClasses();
  },

  onUserEngage() {
    this.isUserEngaged = true;
    this.clearTimers();
    this.resetToForward();
  },

  onUserDisengage(delayMs = 1500) {
    this.clearTimers();
    this.timer = setTimeout(() => {
      this.isUserEngaged = false;
      this.scheduleNext();
    }, delayMs);
  },

  isBusy() {
    const target = picoFigure || picoCharacter;
    if (!target) return false;
    return (
      target.classList.contains('reacting') ||
      target.classList.contains('acknowledging') ||
      target.classList.contains('walking') ||
      target.classList.contains('turning-to-side') ||
      target.classList.contains('turning-to-front') ||
      target.classList.contains('turning-around') ||
      (window.WanderController && (window.WanderController.isWalking || window.WanderController.isTurning)) ||
      (window.UserMovement && window.UserMovement.isMovingFromUser) ||
      isBubbleOpen
    );
  },

  clearTimers() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.restoreTimer) {
      clearTimeout(this.restoreTimer);
      this.restoreTimer = null;
    }
  }
};

window.IdleAttention = IdleAttention;

// Character Animation Controller (Clean visual isolation)
const CharacterActions = {
  // Playful bounce on click
  react() {
    this.playAnimation('reacting', 550);
  },

  // Subtle character nod + closed-eye acknowledgement to communicate "heard you"
  acknowledge() {
    IdleBlink.pauseAndOverride();
    IdleAttention.onUserEngage();

    if (animationTimeout) {
      clearTimeout(animationTimeout);
      animationTimeout = null;
    }

    const targets = [picoFigure, picoCharacter].filter(Boolean);
    targets.forEach(el => {
      el.classList.remove('idle', 'glancing', 'reacting', 'acknowledging');
      void el.offsetWidth; // Force DOM reflow to restart CSS animation cleanly
      el.classList.add('acknowledging');
    });

    // Step 2 & 3: Eyes gently close in a warm blink during the nod (~200ms into the nod)
    setTimeout(() => {
      const isStillAck = targets.some(el => el.classList.contains('acknowledging'));
      if (isStillAck) {
        picoContainer.classList.add('blinking');
      }
    }, 200);

    // Step 4: Eyes softly reopen as the head begins rising back up (~480ms)
    setTimeout(() => {
      picoContainer.classList.remove('blinking');
    }, 480);

    // Step 5: Smoothly return to normal idle state at 800ms
    animationTimeout = setTimeout(() => {
      targets.forEach(el => {
        el.classList.remove('acknowledging');
        if (!window.WanderController || (!window.WanderController.isWalking && !window.WanderController.isTurning && !(window.UserMovement && window.UserMovement.isMovingFromUser))) {
          el.classList.add('idle');
        }
      });
      picoContainer.classList.remove('blinking');
      if (!isBubbleOpen && (!window.WanderController || (!window.WanderController.isWalking && !window.WanderController.isTurning && !(window.UserMovement && window.UserMovement.isMovingFromUser)))) {
        IdleBlink.resume();
        IdleAttention.onUserDisengage(1200);
      }
    }, 800);
  },

  // Small, character-like acknowledgement when cursor enters Pico's hit area
  glance() {
    if (this.isBusy()) return;
    IdleAttention.onUserEngage();
    this.playAnimation('glancing', 420);
    IdleBlink.blinkBriefly(120);
  },

  isBusy() {
    const target = picoFigure || picoCharacter;
    if (!target) return false;
    return (
      target.classList.contains('reacting') ||
      target.classList.contains('acknowledging') ||
      target.classList.contains('walking') ||
      target.classList.contains('turning-to-side') ||
      target.classList.contains('turning-to-front') ||
      target.classList.contains('turning-around') ||
      (window.WanderController && (window.WanderController.isWalking || window.WanderController.isTurning)) ||
      (window.UserMovement && window.UserMovement.isMovingFromUser) ||
      isBubbleOpen
    );
  },

  playAnimation(className, durationMs) {
    // Blinking pauses/overrides while higher-priority animations play
    if (className !== 'glancing') {
      IdleBlink.pauseAndOverride();
    }

    if (animationTimeout) {
      clearTimeout(animationTimeout);
      animationTimeout = null;
    }

    const targets = [picoFigure, picoCharacter].filter(Boolean);
    targets.forEach(el => {
      el.classList.remove('idle', 'glancing', 'reacting', 'acknowledging');
      void el.offsetWidth; // Force DOM reflow to restart CSS animation cleanly
      el.classList.add(className);
    });

    animationTimeout = setTimeout(() => {
      targets.forEach(el => {
        el.classList.remove(className);
        if (!window.WanderController || !window.WanderController.isWalking) {
          el.classList.add('idle');
        }
      });
      if (!isBubbleOpen && (!window.WanderController || !window.WanderController.isWalking)) {
        IdleBlink.resume();
        IdleAttention.onUserDisengage(1200);
      }
    }, durationMs);
  }
};

window.CharacterActions = CharacterActions;

// Physical Surface Abstraction & World Coordinates System (Goal 2)
const SurfaceManager = {
  surfaces: new Map(),
  activeSurfaceId: 'taskbar-main',
  canvasWidth: window.innerWidth,
  canvasHeight: window.innerHeight,

  init(surfacesData, initialSurfaceId = 'taskbar-main') {
    this.surfaces.clear();
    if (Array.isArray(surfacesData)) {
      surfacesData.forEach(s => this.register(s));
    } else if (surfacesData) {
      this.register(surfacesData);
    }
    this.activeSurfaceId = initialSurfaceId;
    this.updateDimensions();
    this.updateVisualShelf();
  },

  updateDimensions() {
    this.canvasWidth = window.innerWidth;
    this.canvasHeight = window.innerHeight;
  },

  updateVisualShelf() {
    const shelfVisual = document.getElementById('elevated-shelf-visual');
    if (!shelfVisual) return;

    const isDebugActive = Boolean(window.DEBUG_SURFACES || document.body.classList.contains('debug-surfaces'));
    const elevatedShelf = this.get('elevated-test-shelf');

    if (isDebugActive && elevatedShelf) {
      const taskbar = this.getHomeSurface();
      const taskbarElev = taskbar?.elevation ?? window.innerHeight;
      const deltaY = taskbarElev - elevatedShelf.elevation;
      const shelfTopFromBottom = 1 + deltaY;
      const shelfLeft = elevatedShelf.bounds.x;
      const shelfWidth = elevatedShelf.bounds.width;

      // Position so the top surface of the glass bar aligns with Pico's shoe soles (1 + deltaY)
      shelfVisual.style.bottom = `${shelfTopFromBottom - 32}px`;
      shelfVisual.style.left = `${shelfLeft}px`;
      shelfVisual.style.width = `${shelfWidth}px`;
      shelfVisual.style.height = `32px`;
      shelfVisual.classList.add('active');
    } else {
      shelfVisual.classList.remove('active');
    }
  },

  register(surface) {
    if (!surface || !surface.id) return;
    this.surfaces.set(surface.id, surface);
    this.updateVisualShelf();
  },

  unregister(id) {
    return this.surfaces.delete(id);
  },

  get(id) {
    return this.surfaces.get(id) || null;
  },

  getActiveSurface() {
    return this.get(this.activeSurfaceId) || this.getHomeSurface();
  },

  setActiveSurface(id) {
    if (this.surfaces.has(id)) {
      this.activeSurfaceId = id;
      return true;
    }
    return false;
  },

  getHomeSurface() {
    for (const surface of this.surfaces.values()) {
      if (surface.isHome) return surface;
    }
    return this.get('taskbar-main') || null;
  },

  getAllSurfaces() {
    return Array.from(this.surfaces.values());
  },

  // 1. Raycasting Downward (find highest surface directly beneath x, y)
  findSurfaceBelow(x, y) {
    let best = null;
    let highestElevationBelow = Infinity;
    for (const s of this.surfaces.values()) {
      const minX = s.walkableRange?.minX ?? s.bounds?.x ?? 0;
      const maxX = s.walkableRange?.maxX ?? ((s.bounds?.x || 0) + (s.bounds?.width || 0)) ?? this.canvasWidth;
      const elev = s.elevation ?? this.canvasHeight;
      if (elev >= y - 1 && x >= minX && x <= maxX) {
        if (elev < highestElevationBelow) {
          highestElevationBelow = elev;
          best = s;
        }
      }
    }
    return best;
  },

  // 2. Raycasting Upward (find lowest surface directly above x, y within maxReach)
  findSurfaceAbove(x, y, maxReach = 350) {
    let best = null;
    let lowestElevationAbove = -Infinity;
    for (const s of this.surfaces.values()) {
      const minX = s.walkableRange?.minX ?? s.bounds?.x ?? 0;
      const maxX = s.walkableRange?.maxX ?? ((s.bounds?.x || 0) + (s.bounds?.width || 0)) ?? this.canvasWidth;
      const elev = s.elevation ?? this.canvasHeight;
      if (elev < y && elev >= (y - maxReach) && x >= minX && x <= maxX) {
        if (elev > lowestElevationAbove) {
          lowestElevationAbove = elev;
          best = s;
        }
      }
    }
    return best;
  },

  // 3. Ledge Proximity & Physical Boundary Metrics
  getLedgeMetrics(surfaceId, x) {
    const s = this.get(surfaceId) || this.getHomeSurface();
    const minX = s?.walkableRange?.minX ?? s?.bounds?.x ?? 0;
    const maxX = s?.walkableRange?.maxX ?? ((s?.bounds?.x || 0) + (s?.bounds?.width || 0)) ?? this.canvasWidth;
    const distLeft = x - minX;
    const distRight = maxX - x;
    const leftBoundaryType = s?.leftBoundaryType ?? (s?.isHome ? 'screen_border' : 'drop_off');
    const rightBoundaryType = s?.rightBoundaryType ?? (s?.isHome ? 'screen_border' : 'drop_off');

    return {
      distLeft,
      distRight,
      minDist: Math.min(distLeft, distRight),
      nearestEdge: distLeft <= distRight ? 'left' : 'right',
      atLeftLedge: distLeft <= 25 && leftBoundaryType === 'drop_off',
      atRightLedge: distRight <= 25 && rightBoundaryType === 'drop_off',
      atLeftWall: distLeft <= 5 && leftBoundaryType !== 'drop_off',
      atRightWall: distRight <= 5 && rightBoundaryType !== 'drop_off'
    };
  },

  // 4. Reachable Surfaces Query
  getReachableSurfaces(fromSurfaceId, currentX, jumpLimits = { maxJumpHeight: 180, maxJumpReach: 150, maxDropHeight: 600 }) {
    const currentSurface = this.get(fromSurfaceId) || this.getHomeSurface();
    if (!currentSurface) return [];

    const reachable = [];
    const fromElevation = currentSurface.elevation ?? this.canvasHeight;

    for (const target of this.surfaces.values()) {
      if (target.id === fromSurfaceId) continue;
      const targetElevation = target.elevation ?? this.canvasHeight;
      const deltaY = fromElevation - targetElevation;
      
      const isUp = deltaY > 0;
      if (isUp && deltaY > jumpLimits.maxJumpHeight) continue;
      if (!isUp && Math.abs(deltaY) > jumpLimits.maxDropHeight) continue;

      const tMin = target.walkableRange?.minX ?? target.bounds?.x ?? 0;
      const tMax = target.walkableRange?.maxX ?? ((target.bounds?.x || 0) + (target.bounds?.width || 0)) ?? this.canvasWidth;

      let horizontalDist = 0;
      if (currentX < tMin) {
        horizontalDist = tMin - currentX;
      } else if (currentX > tMax) {
        horizontalDist = currentX - tMax;
      } else {
        horizontalDist = 0;
      }

      if (horizontalDist <= jumpLimits.maxJumpReach) {
        reachable.push({
          surfaceId: target.id,
          surface: target,
          deltaY,
          horizontalDist,
          transitionType: isUp ? 'jump_up' : (horizontalDist === 0 ? 'drop_down' : 'hop_down'),
          targetLandingX: Math.max(tMin, Math.min(tMax, currentX))
        });
      }
    }

    return reachable.sort((a, b) => (Math.abs(a.deltaY) + a.horizontalDist) - (Math.abs(b.deltaY) + b.horizontalDist));
  },

  // 5. Breadth-First Topological Pathfinding Across Surface Graph
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
      const currentSurf = this.get(currentId);
      const estX = path.length === 0 ? fromX : (currentSurf?.defaultX ?? 200);
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

    return null;
  },

  // Converts local X along a surface into stage translate coordinates { x, y }
  // y = 0 represents the baseline taskbar ledge (grounded at bottom: 1px)
  toCanvasCoords(surfaceId, localX) {
    const surface = this.get(surfaceId) || this.getHomeSurface();
    if (!surface) {
      return { x: Math.round(localX), y: 0 };
    }

    const homeElevation = this.getHomeSurface()?.elevation ?? this.canvasHeight;
    const targetElevation = surface.elevation ?? homeElevation;
    const deltaY = homeElevation - targetElevation;

    return {
      x: Math.round(localX),
      y: Math.round(-deltaY),
      surfaceElevation: targetElevation
    };
  }
};

window.SurfaceManager = SurfaceManager;

// Ledge Awareness & Edge Micro-Reactions (Phase 3 — Step 1)
const LedgeAwareness = {
  isReacting: false,
  lastReaction: null,

  assessEdge(surfaceId, x) {
    const surface = SurfaceManager.get(surfaceId) || SurfaceManager.getActiveSurface();
    if (!surface) {
      return {
        atEdge: false,
        edgeType: 'none',
        side: null,
        distance: Infinity,
        surfaceId: null,
        isPossibleTraversalPoint: false
      };
    }

    const minX = surface.walkableRange?.minX ?? surface.bounds?.x ?? 0;
    const maxX = surface.walkableRange?.maxX ?? ((surface.bounds?.x || 0) + (surface.bounds?.width || 0)) ?? window.innerWidth;
    const distLeft = x - minX;
    const distRight = maxX - x;

    const EDGE_THRESHOLD = 25; // px from physical edge
    const atLeft = distLeft <= EDGE_THRESHOLD;
    const atRight = distRight <= EDGE_THRESHOLD;

    if (!atLeft && !atRight) {
      return {
        atEdge: false,
        edgeType: 'none',
        side: null,
        distance: Math.min(distLeft, distRight),
        surfaceId: surface.id,
        isPossibleTraversalPoint: false
      };
    }

    const side = distLeft <= distRight ? 'left' : 'right';
    const distance = side === 'left' ? distLeft : distRight;

    // Check boundary type of this side
    const rawBoundaryType = side === 'left'
      ? (surface.leftBoundaryType || (surface.isHome ? 'screen_border' : 'drop_off'))
      : (surface.rightBoundaryType || (surface.isHome ? 'screen_border' : 'drop_off'));

    // Check if there is a reachable connected surface below or above within immediate edge traversal reach
    const reachable = SurfaceManager.getReachableSurfaces(surface.id, x, {
      maxJumpHeight: 180,
      maxJumpReach: 60, // directly accessible from this edge
      maxDropHeight: 180 // immediate step/hop down rather than a sheer drop
    });

    // If there is a reachable surface in the vicinity, treat as potential traversal point!
    if (reachable && reachable.length > 0) {
      const topTarget = reachable[0];
      return {
        atEdge: true,
        edgeType: 'potential_traversal',
        side,
        distance,
        surfaceId: surface.id,
        boundaryType: rawBoundaryType,
        connectedSurface: topTarget.surface,
        connectedSurfaceId: topTarget.surfaceId,
        transitionType: topTarget.transitionType,
        deltaY: topTarget.deltaY,
        targetLandingX: topTarget.targetLandingX,
        isPossibleTraversalPoint: true
      };
    }

    // If boundary is screen_border, treat separately (screen edge for eventual off-screen departure)
    if (rawBoundaryType === 'screen_border') {
      return {
        atEdge: true,
        edgeType: 'screen_edge',
        side,
        distance,
        surfaceId: surface.id,
        boundaryType: 'screen_border',
        connectedSurface: null,
        isPossibleTraversalPoint: false
      };
    }

    // Otherwise, it is a surface endpoint / drop-off
    return {
      atEdge: true,
      edgeType: 'drop_off',
      side,
      distance,
      surfaceId: surface.id,
      boundaryType: rawBoundaryType,
      connectedSurface: null,
      isPossibleTraversalPoint: false
    };
  },

  applyReaction(assessment) {
    if (!picoFigure) return;
    this.isReacting = true;
    this.lastReaction = assessment;

    const side = assessment.side;
    this.clearReactionClasses();

    if (assessment.edgeType === 'drop_off') {
      // 1. Surface Endpoint Drop-Off:
      // Brief hesitation pause, small downward glance/lean over the ledge
      picoFigure.classList.add('gaze-down', 'head-down', 'ledge-peering');
      if (side === 'right') {
        picoFigure.classList.add('ledge-lean-right');
      } else {
        picoFigure.classList.add('ledge-lean-left');
      }
    } else if (assessment.edgeType === 'screen_edge') {
      // 2. Screen Edge:
      // Calm, outward glance looking past the screen edge (anticipating future off-screen traversal)
      if (side === 'right') {
        picoFigure.classList.add('gaze-right', 'screen-edge-peeking-right');
      } else {
        picoFigure.classList.add('gaze-left', 'screen-edge-peeking-left');
      }
    } else if (assessment.edgeType === 'potential_traversal') {
      // 3. Potential Connected Surface Below / Above:
      // Recognizes viable traversal route; curious upward or downward scope
      if (assessment.transitionType === 'jump_up') {
        picoFigure.classList.add('traversal-scoping-up');
      } else {
        picoFigure.classList.add('gaze-down', 'traversal-scoping-down');
      }
    }
  },

  clearReactionClasses() {
    if (!picoFigure) return;
    picoFigure.classList.remove(
      'gaze-left', 'gaze-right', 'gaze-down',
      'head-down', 'head-tilt',
      'ledge-peering', 'ledge-lean-left', 'ledge-lean-right',
      'screen-edge-peeking-left', 'screen-edge-peeking-right',
      'traversal-scoping-up', 'traversal-scoping-down'
    );
  },

  async triggerReaction(assessment) {
    if (this.isReacting || !picoFigure) return;
    this.applyReaction(assessment);

    const duration = assessment.edgeType === 'drop_off' ? 500 : (assessment.edgeType === 'screen_edge' ? 450 : 500);
    await new Promise(r => setTimeout(r, duration));

    this.clearReactionClasses();
    this.isReacting = false;
  }
};

window.LedgeAwareness = LedgeAwareness;

// Physical World Coordinator (Phase 3 Foundation)
const PhysicsWorld = {
  getSurfaces() {
    return SurfaceManager.getAllSurfaces();
  },
  getSurface(id) {
    return SurfaceManager.get(id);
  },
  getActiveSurface() {
    return SurfaceManager.getActiveSurface();
  },
  findSurfaceBelow(x, y) {
    return SurfaceManager.findSurfaceBelow(x, y);
  },
  findSurfaceAbove(x, y, maxReach) {
    return SurfaceManager.findSurfaceAbove(x, y, maxReach);
  },
  getLedgeMetrics(surfaceId, x) {
    return SurfaceManager.getLedgeMetrics(surfaceId, x);
  },
  getReachableSurfaces(surfaceId, currentX, jumpLimits) {
    return SurfaceManager.getReachableSurfaces(surfaceId, currentX, jumpLimits);
  },
  findNavigationPath(fromSurfaceId, fromX, targetSurfaceId, targetX, jumpLimits) {
    return SurfaceManager.findNavigationPath(fromSurfaceId, fromX, targetSurfaceId, targetX, jumpLimits);
  },
  getPhysicalState() {
    const surface = SurfaceManager.getActiveSurface();
    const currentX = WanderController.currentX;
    const canvasCoords = SurfaceManager.toCanvasCoords(WanderController.currentSurfaceId, currentX);
    const ledgeMetrics = SurfaceManager.getLedgeMetrics(WanderController.currentSurfaceId, currentX);
    const edgeAssessment = LedgeAwareness.assessEdge(WanderController.currentSurfaceId, currentX);

    return {
      isGrounded: true,
      surfaceId: WanderController.currentSurfaceId,
      surfaceType: surface?.type ?? 'taskbar',
      surfaceLabel: surface?.label ?? 'Windows Taskbar',
      localX: currentX,
      canvasX: canvasCoords.x,
      canvasY: canvasCoords.y,
      elevation: surface?.elevation ?? window.innerHeight,
      isHome: surface?.isHome ?? true,
      footDrift: 0,
      footprint: { width: 38, height: 60 },
      ledge: ledgeMetrics,
      edgeAssessment,
      isPossibleTraversalPoint: edgeAssessment.isPossibleTraversalPoint || false,
      potentialTraversal: edgeAssessment.edgeType === 'potential_traversal' ? {
        connectedSurfaceId: edgeAssessment.connectedSurfaceId,
        transitionType: edgeAssessment.transitionType,
        deltaY: edgeAssessment.deltaY
      } : null
    };
  }
};

window.PhysicsWorld = PhysicsWorld;

// World Coordinates Inspector
window.getPicoWorldCoords = () => {
  const state = PhysicsWorld.getPhysicalState();
  return {
    surfaceId: state.surfaceId,
    surfaceType: state.surfaceType,
    surfaceLabel: state.surfaceLabel,
    localX: state.localX,
    canvasX: state.canvasX,
    canvasY: state.canvasY,
    elevation: state.elevation,
    isHome: state.isHome,
    footDrift: state.footDrift,
    ledge: state.ledge,
    edgeAssessment: state.edgeAssessment
  };
};

// Autonomous Taskbar Wandering & Locomotion Controller
const WanderController = {
  currentSurfaceId: 'taskbar-main',
  currentX: 0,
  currentY: 0,
  minX: 0,
  maxX: 1200,
  isWalking: false,
  isTurning: false,
  currentFacing: 'right', // 'right' or 'left'
  wanderTimer: null,
  animFrameId: null,
  accumulatedDistance: 0,
  lastStepPhase: -1,
  currentGoal: null,

  async init() {
    let surfaceData = null;
    try {
      if (window.picoAPI?.getAllSurfaces) {
        const surfaces = await window.picoAPI.getAllSurfaces().catch(() => null);
        if (surfaces && surfaces.length > 0) {
          SurfaceManager.init(surfaces, 'taskbar-main');
          surfaceData = SurfaceManager.getActiveSurface();
        }
      }

      if (!surfaceData && window.picoAPI?.getTaskbarSurface) {
        const surface = await window.picoAPI.getTaskbarSurface().catch(() => null);
        if (surface) {
          SurfaceManager.init([{
            id: 'taskbar-main',
            type: 'taskbar',
            label: 'Windows Taskbar',
            bounds: surface.workArea || { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
            walkableRange: { minX: surface.minX ?? 0, maxX: surface.maxX ?? Math.max(0, window.innerWidth - 38) },
            elevation: surface.ledgeY ?? window.innerHeight,
            isHome: true,
            defaultX: surface.defaultX ?? Math.round(window.innerWidth * 0.78)
          }], 'taskbar-main');
          surfaceData = SurfaceManager.getActiveSurface();
        }
      }
    } catch {
      // Fallback
    }

    if (!surfaceData) {
      SurfaceManager.init([{
        id: 'taskbar-main',
        type: 'taskbar',
        label: 'Windows Taskbar',
        bounds: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
        walkableRange: { minX: 0, maxX: Math.max(0, window.innerWidth - 38) },
        elevation: window.innerHeight,
        isHome: true,
        defaultX: Math.round(window.innerWidth * 0.78)
      }], 'taskbar-main');
      surfaceData = SurfaceManager.getActiveSurface();
    }

    this.currentSurfaceId = surfaceData.id;
    const range = surfaceData.walkableRange || { minX: 0, maxX: Math.max(0, window.innerWidth - 38) };
    this.minX = range.minX;
    this.maxX = range.maxX;
    this.currentX = surfaceData.defaultX ?? Math.max(this.minX, this.maxX - 40);
    this.currentY = 0;

    this.setStagePosition(this.currentX, this.currentY);
    this.scheduleNextWander();
  },

  setStagePosition(x, y = 0) {
    this.currentX = Math.round(x);
    this.currentY = Math.round(y);
    if (desktopStage) {
      if (this.currentY === 0) {
        desktopStage.style.transform = `translateX(${this.currentX}px)`;
      } else {
        desktopStage.style.transform = `translate(${this.currentX}px, ${this.currentY}px)`;
      }
      // Flip speech bubble to left side if within 240px of the right screen edge
      const shouldFlip = this.currentX > (this.maxX - 240);
      desktopStage.classList.toggle('bubble-flipped', shouldFlip);
    }
  },

  setStageX(x) {
    this.setStagePosition(x, this.currentY || 0);
  },

  scheduleNextWander() {
    this.clearWanderTimer();
    // Restrained, occasional wander: 22s to 45s between decisions
    const delayMs = Math.floor(22000 + Math.random() * 23000);
    this.wanderTimer = setTimeout(() => {
      this.maybeWander();
    }, delayMs);
  },

  clearWanderTimer() {
    if (this.wanderTimer) {
      clearTimeout(this.wanderTimer);
      this.wanderTimer = null;
    }
  },

  async executeGoal(goal) {
    if (!goal) return this.currentX;

    // Cancellation / Stop handling
    if (goal.type === 'CANCEL') {
      this.stop();
      return this.currentX;
    }

    // Preempt active autonomous walk if an explicit user movement command arrives
    if (this.isWalking && this.currentGoal?.source === 'autonomous' && goal.source === 'user') {
      this.stop();
    }

    // Hop Up / Jump Up / Ledge Above Goals
    if (goal.type === 'JUMP_UP' || goal.type === 'JUMP_LEDGE_ABOVE') {
      const currentSurface = SurfaceManager.get(this.currentSurfaceId) || SurfaceManager.getActiveSurface();
      const currentElevation = currentSurface?.elevation ?? window.innerHeight;

      // 1. Identify candidate elevated surfaces
      const allSurfaces = SurfaceManager.getAllSurfaces();
      const elevatedSurfaces = allSurfaces.filter(s => {
        if (s.id === this.currentSurfaceId) return false;
        const targetElev = s.elevation ?? window.innerHeight;
        const deltaY = currentElevation - targetElev;
        return deltaY > 15; // Higher than current
      });

      if (elevatedSurfaces.length === 0) {
        // No valid target surface above: gracefully stay grounded
        await this.performCuriousGlance('up');
        return this.currentX;
      }

      let selectedSurface = null;

      if (goal.directlyAbove) {
        // Explicitly target surface directly overhead
        const directlyAboveSurface = SurfaceManager.findSurfaceAbove(this.currentX, currentElevation, 320);
        if (directlyAboveSurface) {
          selectedSurface = directlyAboveSurface;
        } else {
          selectedSurface = elevatedSurfaces.reduce((best, s) => {
            const dist = Math.abs(this.currentX - (s.defaultX ?? s.bounds?.x ?? 0));
            const bestDist = Math.abs(this.currentX - (best.defaultX ?? best.bounds?.x ?? 0));
            return dist < bestDist ? s : best;
          }, elevatedSurfaces[0]);
        }
      } else {
        // Choose suitable reachable surface above Pico
        const reachable = SurfaceManager.getReachableSurfaces(this.currentSurfaceId, this.currentX, {
          maxJumpHeight: 180,
          maxJumpReach: 160,
          maxDropHeight: 180
        });
        const upTarget = reachable.find(r => r.transitionType === 'jump_up' && r.deltaY > 15);
        if (upTarget) {
          selectedSurface = upTarget.surface;
        } else {
          selectedSurface = elevatedSurfaces[0];
        }
      }

      if (!selectedSurface) {
        await this.performCuriousGlance('up');
        return this.currentX;
      }

      const targetMinX = selectedSurface.walkableRange?.minX ?? selectedSurface.bounds?.x ?? 0;
      const targetMaxX = selectedSurface.walkableRange?.maxX ?? ((selectedSurface.bounds?.x || 0) + (selectedSurface.bounds?.width || 0)) ?? window.innerWidth;
      const targetLandingX = Math.max(targetMinX, Math.min(targetMaxX, this.currentX));

      // Walk into jump range if horizontal distance is too far
      const horizontalDist = this.currentX < targetMinX 
        ? targetMinX - this.currentX 
        : (this.currentX > targetMaxX ? this.currentX - targetMaxX : 0);

      if (horizontalDist > 60) {
        const approachX = this.currentX < targetMinX ? targetMinX : targetMaxX;
        await this.walkTo(approachX, 36);
      }

      // Orient toward target
      const jumpDir = targetLandingX >= this.currentX ? 'right' : 'left';
      if (this.currentFacing !== jumpDir) {
        await this.turnToSide(jumpDir);
      }

      return await this.jumpToSurface(selectedSurface.id, targetLandingX);
    }

    // Jump to the other ledge
    if (goal.type === 'JUMP_OTHER_LEDGE') {
      const currentSurface = SurfaceManager.get(this.currentSurfaceId) || SurfaceManager.getActiveSurface();
      const allSurfaces = SurfaceManager.getAllSurfaces();

      // Find other valid surfaces (excluding current)
      let otherSurfaces = allSurfaces.filter(s => s.id !== this.currentSurfaceId);

      // If currently on an elevated ledge, prioritize other non-home ledges
      if (!currentSurface?.isHome && otherSurfaces.some(s => !s.isHome)) {
        otherSurfaces = otherSurfaces.filter(s => !s.isHome);
      }

      if (otherSurfaces.length === 0) {
        // No other ledge exists: gracefully stay grounded
        await this.performCuriousGlance('side');
        return this.currentX;
      }

      // Select nearest other ledge
      const targetSurface = otherSurfaces.reduce((best, s) => {
        const dist = Math.abs(this.currentX - (s.defaultX ?? s.bounds?.x ?? 0));
        const bestDist = Math.abs(this.currentX - (best.defaultX ?? best.bounds?.x ?? 0));
        return dist < bestDist ? s : best;
      }, otherSurfaces[0]);

      const targetMinX = targetSurface.walkableRange?.minX ?? targetSurface.bounds?.x ?? 0;
      const targetMaxX = targetSurface.walkableRange?.maxX ?? ((targetSurface.bounds?.x || 0) + (targetSurface.bounds?.width || 0)) ?? window.innerWidth;

      const currentMinX = currentSurface?.walkableRange?.minX ?? this.minX;
      const currentMaxX = currentSurface?.walkableRange?.maxX ?? this.maxX;

      const isTargetToRight = targetMinX > currentMaxX;
      const isTargetToLeft = targetMaxX < currentMinX;

      let targetLandingX = targetSurface.defaultX ?? Math.round((targetMinX + targetMaxX) / 2);

      if (isTargetToRight) {
        const launchEdgeX = currentMaxX;
        if (Math.abs(this.currentX - launchEdgeX) > 10) {
          await this.walkTo(launchEdgeX, 36);
        }
        targetLandingX = targetMinX + 15;
      } else if (isTargetToLeft) {
        const launchEdgeX = currentMinX;
        if (Math.abs(this.currentX - launchEdgeX) > 10) {
          await this.walkTo(launchEdgeX, 36);
        }
        targetLandingX = targetMaxX - 15;
      }

      // Orient toward target
      const jumpDir = isTargetToRight ? 'right' : (isTargetToLeft ? 'left' : (targetLandingX >= this.currentX ? 'right' : 'left'));
      if (this.currentFacing !== jumpDir) {
        await this.turnToSide(jumpDir);
      }

      const currentElev = currentSurface?.elevation ?? window.innerHeight;
      const targetElev = targetSurface?.elevation ?? window.innerHeight;
      const deltaY = currentElev - targetElev;

      if (deltaY < -40) {
        return await this.dropDownToSurface(targetSurface.id, targetLandingX);
      } else {
        return await this.jumpToSurface(targetSurface.id, targetLandingX);
      }
    }

    // Drop Down / Jump Down / Come Down / Return to taskbar
    if (goal.type === 'DROP_DOWN') {
      const currentSurface = SurfaceManager.get(this.currentSurfaceId) || SurfaceManager.getActiveSurface();
      const homeSurface = SurfaceManager.getHomeSurface();

      if (currentSurface?.isHome || this.currentSurfaceId === 'taskbar-main') {
        // Already on taskbar: gracefully remain grounded
        await this.performCuriousGlance('down');
        return this.currentX;
      }

      const surfaceBelow = SurfaceManager.findSurfaceBelow(this.currentX, (currentSurface?.elevation ?? 0) + 10);
      const targetSurface = surfaceBelow || homeSurface;

      if (!targetSurface) {
        await this.performCuriousGlance('down');
        return this.currentX;
      }

      const landingX = this.currentX;

      const dropDir = this.currentFacing === 'front' ? 'right' : this.currentFacing;
      if (this.currentFacing !== dropDir) {
        await this.turnToSide(dropDir);
      }

      return await this.dropDownToSurface(targetSurface.id, landingX);
    }

    const surface = SurfaceManager.get(goal.surfaceId || this.currentSurfaceId) || SurfaceManager.getActiveSurface();
    const minX = surface?.walkableRange?.minX ?? this.minX;
    const maxX = surface?.walkableRange?.maxX ?? this.maxX;

    const targetX = resolveMovementTarget(goal, this.currentX, minX, maxX);
    this.currentGoal = goal;

    const resultX = await this.walkTo(targetX, 36);
    this.currentGoal = null;
    return resultX;
  },

  async performCuriousGlance(type = 'up') {
    IdleBlink.pauseAndOverride();
    IdleAttention.clearTimers();
    IdleAttention.clearStateClasses();

    if (type === 'up') {
      picoFigure.classList.add('gaze-up', 'head-up');
    } else if (type === 'down') {
      picoFigure.classList.add('gaze-down', 'head-down');
    } else {
      picoFigure.classList.add('head-tilt');
    }

    await new Promise(r => setTimeout(r, 450));

    IdleAttention.clearStateClasses();
    picoFigure.classList.add('idle');
    IdleBlink.resume();
  },

  maybeWander() {
    // If Pico is talking, being clicked, hovering, or user movement active: quietly postpone
    if (this.isWalking || this.isTurning || isBubbleOpen || CharacterActions.isBusy() || UserMovement.isMovingFromUser || (this.currentGoal && this.currentGoal.source === 'user')) {
      this.scheduleNextWander();
      return;
    }

    // 40% probability to wander, 60% probability to remain quietly standing
    if (Math.random() < 0.60) {
      this.scheduleNextWander();
      return;
    }

    this.wander();
  },

  wander() {
    if (this.isWalking || this.isTurning || isBubbleOpen || CharacterActions.isBusy() || UserMovement.isMovingFromUser) return;

    let dir = Math.random() < 0.5 ? 'left' : 'right';
    const edge = LedgeAwareness.assessEdge(this.currentSurfaceId, this.currentX);
    if (edge.atEdge) {
      if (edge.side === 'left') dir = 'right';
      else if (edge.side === 'right') dir = 'left';
    } else {
      if (this.currentX - 80 < this.minX) {
        dir = 'right';
      } else if (this.currentX + 80 > this.maxX) {
        dir = 'left';
      }
    }

    const goalType = Math.random() < 0.3 ? 'MEDIUM' : 'SHORT';
    const goal = new MovementGoal({
      type: goalType,
      direction: dir,
      source: 'autonomous'
    });

    this.executeGoal(goal);
  },

  // Turn from front-facing idle to side profile facing the given direction
  turnToSide(direction) {
    return new Promise((resolve) => {
      this.isTurning = true;
      this.currentFacing = direction;

      // Set facing class on facer
      if (direction === 'right') {
        picoFacer.classList.remove('facing-left');
        picoFacer.classList.add('facing-right');
      } else {
        picoFacer.classList.remove('facing-right');
        picoFacer.classList.add('facing-left');
      }

      picoFigure.classList.remove('idle', 'walking', 'turning-to-front', 'turning-around');
      void picoFigure.offsetWidth; // restart CSS transition
      picoFigure.classList.add('turning-to-side');

      // Mid-turn (75ms): switch from front sprite to side profile
      setTimeout(() => {
        picoFigure.classList.add('walking');
      }, 75);

      // End of turn (150ms): settle into side profile
      setTimeout(() => {
        picoFigure.classList.remove('turning-to-side');
        this.isTurning = false;
        resolve();
      }, 150);
    });
  },

  // Turn around when reversing direction while already walking
  turnAround(newDirection) {
    return new Promise((resolve) => {
      this.isTurning = true;
      this.clearStepAnimation();

      picoFigure.classList.remove('turning-to-side', 'turning-to-front');
      void picoFigure.offsetWidth;
      picoFigure.classList.add('turning-around');

      // Mid-turn (80ms): flip facing direction
      setTimeout(() => {
        this.currentFacing = newDirection;
        if (newDirection === 'right') {
          picoFacer.classList.remove('facing-left');
          picoFacer.classList.add('facing-right');
        } else {
          picoFacer.classList.remove('facing-right');
          picoFacer.classList.add('facing-left');
        }
      }, 80);

      // End of turn (160ms): resume walking in new direction
      setTimeout(() => {
        picoFigure.classList.remove('turning-around');
        this.isTurning = false;
        resolve();
      }, 160);
    });
  },

  // Turn from side profile back to front-facing idle stance
  turnToFront() {
    return new Promise((resolve) => {
      this.isTurning = true;
      this.clearStepAnimation();

      picoFigure.classList.remove('turning-to-side', 'turning-around');
      void picoFigure.offsetWidth;
      picoFigure.classList.add('turning-to-front');

      // Mid-turn (75ms): switch from side sprite to front sprite
      setTimeout(() => {
        picoFigure.classList.remove('walking');
        picoFigure.classList.add('idle');
      }, 75);

      // End of turn (150ms): settle into idle stance
      setTimeout(() => {
        picoFigure.classList.remove('turning-to-front');
        this.isTurning = false;
        resolve();
      }, 150);
    });
  },

  async walkTo(targetX, speedPxPerSec = 36) {
    if (this.isWalking) {
      this.stop();
    }

    targetX = Math.max(this.minX, Math.min(this.maxX, Math.round(targetX)));
    const startX = this.currentX;
    const totalDistance = targetX - startX;
    const absDistance = Math.abs(totalDistance);
    if (absDistance < 2) return Promise.resolve(this.currentX);

    this.clearWanderTimer();

    // Pause idle breathing, blinking, and attention shifts during walking
    IdleBlink.pauseAndOverride();
    IdleAttention.clearTimers();
    IdleAttention.clearStateClasses();
    picoFigure.classList.remove('idle', 'glancing', 'reacting', 'acknowledging');

    const targetDirection = totalDistance > 0 ? 'right' : 'left';

    // 1. Turning: if idle front-facing, transition to side profile
    if (!picoFigure.classList.contains('walking')) {
      await this.turnToSide(targetDirection);
    } else if (this.currentFacing !== targetDirection) {
      // Reversing direction while already in side stance
      await this.turnAround(targetDirection);
    }

    this.isWalking = true;
    this.accumulatedDistance = 0;
    this.lastStepPhase = -1;
    this.updateStepAnimation();

    // Locomotion Kinematics:
    // Natural cruising speed of a calm, casual desktop resident (36 px/s).
    // Bounded acceleration and deceleration zones (12px each) so long journeys
    // cruise smoothly at full speed without multi-second creeping or stalling.
    const cruiseSpeed = Math.max(16, speedPxPerSec);
    const accelDist = Math.min(12, absDistance / 2);
    const decelDist = accelDist;

    let previousTime = performance.now();
    let travelledDist = 0;

    return new Promise((resolve) => {
      const step = async (currentTime) => {
        if (!this.isWalking) {
          resolve(this.currentX);
          return;
        }

        const dt = Math.min(0.05, (currentTime - previousTime) / 1000);
        previousTime = currentTime;

        // Kinematic velocity profile with subtle per-step weight transfer & effort:
        let baseSpeed;
        if (travelledDist < accelDist) {
          const p = Math.max(0, travelledDist / accelDist);
          baseSpeed = Math.max(12, cruiseSpeed * Math.sqrt(p));
        } else if (travelledDist > absDistance - decelDist) {
          const rem = Math.max(0, absDistance - travelledDist);
          const p = Math.max(0, rem / decelDist);
          baseSpeed = Math.max(8, cruiseSpeed * Math.sqrt(p));
        } else {
          baseSpeed = cruiseSpeed;
        }

        // Natural cadence & weight transfer modulation:
        // Decelerates slightly into foot plant (weight absorption), surges forward during push-off
        const stepProgress = (this.accumulatedDistance % 10) / 10;
        const strideMod = 1.0 - 0.20 * Math.cos(2 * Math.PI * stepProgress);
        const currentSpeed = baseSpeed * strideMod;

        const moveDelta = currentSpeed * dt;
        travelledDist = Math.min(absDistance, travelledDist + moveDelta);
        const newX = startX + (totalDistance > 0 ? travelledDist : -travelledDist);
        this.setStageX(newX);

        // Advance animation state strictly based on ground translation
        this.accumulatedDistance += moveDelta;
        this.updateStepAnimation();

        if (travelledDist < absDistance) {
          this.animFrameId = requestAnimationFrame(step);
        } else {
          this.setStageX(targetX);
          this.isWalking = false;
          this.clearStepAnimation();

          // Transition back to front-facing idle stance
          await this.turnToFront();

          // Edge micro-reaction on arrival near any boundary
          const edgeAssessment = LedgeAwareness.assessEdge(this.currentSurfaceId, this.currentX);
          if (edgeAssessment.atEdge && !isBubbleOpen && !CharacterActions.isBusy()) {
            await LedgeAwareness.triggerReaction(edgeAssessment);
          }

          if (!isBubbleOpen) {
            IdleBlink.resume();
            IdleAttention.onUserDisengage(1500);
          }

          this.scheduleNextWander();
          resolve(this.currentX);
        }
      };

      this.animFrameId = requestAnimationFrame(step);
    });
  },

  updateStepAnimation() {
    if (!this.isWalking) return;
    // Step cadence & rhythm:
    // Full 2-step cycle is 20px (10px per single step).
    // In each 10px step:
    // - Initial ~4.5px is Passing (legs pass under body, body reaches full vertical height)
    // - Next ~5.5px is Step Plant (foot strikes ground, heel of opposite foot lifts, body settles slightly with weight transfer)
    const cycleDist = this.accumulatedDistance % 20;
    let phase = 0;
    if (cycleDist < 4.5) {
      phase = 0; // Passing (before Step 1)
    } else if (cycleDist < 10) {
      phase = 1; // Step 1: Right foot lead plant, left foot heel lifted
    } else if (cycleDist < 14.5) {
      phase = 2; // Passing (before Step 2)
    } else {
      phase = 3; // Step 2: Left foot lead plant, right foot heel lifted
    }

    if (phase === this.lastStepPhase) return;
    this.lastStepPhase = phase;

    picoFigure.classList.remove('walk-step-1', 'walk-step-2', 'walk-passing');
    if (phase === 1) {
      picoFigure.classList.add('walk-step-1');
    } else if (phase === 3) {
      picoFigure.classList.add('walk-step-2');
    } else {
      picoFigure.classList.add('walk-passing');
    }
  },

  clearStepAnimation() {
    this.lastStepPhase = -1;
    picoFigure.classList.remove('walk-step-1', 'walk-step-2', 'walk-passing');
  },

  startStepCycle() {
    this.clearStepAnimation();
    this.updateStepAnimation();
  },

  stopStepCycle() {
    this.clearStepAnimation();
  },

  // Phase 3 — Step 2 & 3A: Physical Articulated Hop Kinematics (Jump Up to Higher Ledge)
  async jumpToSurface(targetSurfaceId, targetLandingX = null) {
    if (this.isWalking || this.isTurning) {
      this.stop();
    }

    const targetSurface = SurfaceManager.get(targetSurfaceId);
    if (!targetSurface) return this.currentX;

    const startX = this.currentX;
    const startY = this.currentY || 0;

    const minX = targetSurface.walkableRange?.minX ?? targetSurface.bounds?.x ?? 0;
    const maxX = targetSurface.walkableRange?.maxX ?? ((targetSurface.bounds?.x || 0) + (targetSurface.bounds?.width || 0)) ?? window.innerWidth;

    const landingX = targetLandingX !== null 
      ? Math.max(minX, Math.min(maxX, Math.round(targetLandingX)))
      : (targetSurface.defaultX ?? Math.round((minX + maxX) / 2));

    const targetCanvas = SurfaceManager.toCanvasCoords(targetSurfaceId, landingX);
    const targetX = targetCanvas.x;
    const targetY = targetCanvas.y;

    const deltaX = targetX - startX;
    const deltaY = targetY - startY; // Negative when jumping up

    this.clearWanderTimer();
    IdleBlink.pauseAndOverride();
    IdleAttention.clearTimers();
    IdleAttention.clearStateClasses();

    // 1. Orient toward target ledge
    const jumpDir = deltaX >= 0 ? 'right' : 'left';
    if (this.currentFacing !== jumpDir) {
      await this.turnToSide(jumpDir);
    }

    // 2. Preparation: Small crouch/compression with planted feet (~140ms)
    // Feet remain planted flat on source surface (0px drift), knees bend, body lowers
    picoFigure.classList.remove('idle', 'walking', 'jumping', 'jump-phase-crouch', 'jump-phase-launch', 'jump-phase-air', 'jump-phase-descend', 'jump-phase-land', 'jump-crouch', 'jump-air-rise', 'jump-air-fall', 'jump-land');
    picoFigure.classList.add('jumping', 'jump-phase-crouch', 'jump-crouch');
    await new Promise(r => setTimeout(r, 140));

    // 3. Push-off: Body visibly extends upward/outward; toes push off surface (~70ms)
    picoFigure.classList.remove('jump-phase-crouch', 'jump-crouch');
    picoFigure.classList.add('jump-phase-launch', 'jump-air-rise');
    this.setStagePosition(startX, startY - 3); // initial upward impulse
    await new Promise(r => setTimeout(r, 70));

    // 4. Airborne Phase: Tucked legs, smooth parabolic flight
    picoFigure.classList.remove('jump-phase-launch');
    picoFigure.classList.add('jump-phase-air');

    const duration = Math.max(450, Math.min(620, 450 + Math.abs(deltaY) * 0.45));
    const apexExtra = 26; // 26px clear parabolic arc
    const startTime = performance.now();

    await new Promise((resolve) => {
      const step = (currentTime) => {
        const elapsed = currentTime - startTime;
        const u = Math.min(1, elapsed / duration);

        // Smooth horizontal progression (smoothstep)
        const easeX = u * u * (3 - 2 * u);
        const curX = startX + deltaX * easeX;

        // Parabolic vertical trajectory
        const curY = startY + deltaY * u - (4 * apexExtra * u * (1 - u));

        this.setStagePosition(curX, curY);

        // 5. Descent Phase: Shortly before reaching target (u >= 0.76), prepare for landing
        // Legs extend downward toward target surface, body straightens upright
        if (u >= 0.76 && picoFigure.classList.contains('jump-phase-air')) {
          picoFigure.classList.remove('jump-phase-air', 'jump-air-rise');
          picoFigure.classList.add('jump-phase-descend', 'jump-air-fall');
        }

        if (u < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(step);
    });

    // 6. Touchdown & Soft Landing Impact Absorption (~110ms)
    // Feet make contact with target surface, knees softly compress
    this.currentSurfaceId = targetSurface.id;
    this.minX = minX;
    this.maxX = maxX;
    this.setStagePosition(targetX, targetY);

    picoFigure.classList.remove('jump-phase-descend', 'jump-air-fall');
    picoFigure.classList.add('jump-phase-land', 'jump-land');
    await new Promise(r => setTimeout(r, 110));

    // 7. Stabilize and Return to Grounded Idle on Target Surface
    picoFigure.classList.remove('jumping', 'jump-phase-land', 'jump-land');
    await this.turnToFront();
    picoFigure.classList.add('idle');

    if (!isBubbleOpen) {
      IdleBlink.resume();
      IdleAttention.onUserDisengage(1500);
    }
    this.scheduleNextWander();

    return this.currentX;
  },

  // Phase 3 — Step 2 & 3A: Physical Articulated Controlled Drop-Down Kinematics
  async dropDownToSurface(targetSurfaceId, targetLandingX = null) {
    if (this.isWalking || this.isTurning) {
      this.stop();
    }

    const targetSurface = SurfaceManager.get(targetSurfaceId);
    if (!targetSurface) return this.currentX;

    const startX = this.currentX;
    const startY = this.currentY || 0;

    const downMinX = targetSurface.walkableRange?.minX ?? targetSurface.bounds?.x ?? 0;
    const downMaxX = targetSurface.walkableRange?.maxX ?? ((targetSurface.bounds?.x || 0) + (targetSurface.bounds?.width || 0)) ?? window.innerWidth;

    const landingX = targetLandingX !== null 
      ? Math.max(downMinX, Math.min(downMaxX, Math.round(targetLandingX)))
      : (targetSurface.defaultX ?? Math.round((downMinX + downMaxX) / 2));

    const targetCanvas = SurfaceManager.toCanvasCoords(targetSurfaceId, landingX);
    const targetX = targetCanvas.x;
    const targetY = targetCanvas.y;

    const deltaX = targetX - startX;
    const deltaY = targetY - startY; // Positive when dropping down

    this.clearWanderTimer();
    IdleBlink.pauseAndOverride();
    IdleAttention.clearTimers();
    IdleAttention.clearStateClasses();

    // 1. Turning & Ledge Hesitation / Look-Down (~160ms)
    const dropDir = deltaX >= 0 ? 'right' : 'left';
    if (this.currentFacing !== dropDir) {
      await this.turnToSide(dropDir);
    }

    picoFigure.classList.remove('idle', 'walking', 'jumping', 'jump-phase-crouch', 'jump-phase-launch', 'jump-phase-air', 'jump-phase-descend', 'jump-phase-land');
    picoFigure.classList.add('gaze-down', 'head-down');
    await new Promise(r => setTimeout(r, 160));

    // 2. Step-Off / Push-Off (~70ms)
    picoFigure.classList.remove('gaze-down', 'head-down');
    picoFigure.classList.add('jumping', 'jump-phase-launch');
    await new Promise(r => setTimeout(r, 70));

    // 3. Accelerated Fall with Tucked Legs
    picoFigure.classList.remove('jump-phase-launch');
    picoFigure.classList.add('jump-phase-air');

    const duration = Math.max(380, Math.min(520, 380 + Math.abs(deltaY) * 0.35));
    const startTime = performance.now();

    await new Promise((resolve) => {
      const step = (currentTime) => {
        const elapsed = currentTime - startTime;
        const u = Math.min(1, elapsed / duration);

        // Forward progression
        const curX = startX + deltaX * u;
        // Gravity accelerated fall (u^1.4)
        const curY = startY + deltaY * Math.pow(u, 1.4);

        this.setStagePosition(curX, curY);

        // Pre-landing descent prep (u >= 0.72): legs reach down for landing surface
        if (u >= 0.72 && picoFigure.classList.contains('jump-phase-air')) {
          picoFigure.classList.remove('jump-phase-air');
          picoFigure.classList.add('jump-phase-descend');
        }

        if (u < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(step);
    });

    // 4. Exact Foot-Locking Arrival & Soft Landing Impact Absorption (~110ms)
    this.currentSurfaceId = targetSurface.id;
    this.minX = downMinX;
    this.maxX = downMaxX;
    this.setStagePosition(targetX, targetY);

    picoFigure.classList.remove('jump-phase-descend');
    picoFigure.classList.add('jump-phase-land', 'jump-land');
    await new Promise(r => setTimeout(r, 110));

    // 5. Stabilize and Return to Grounded Idle
    picoFigure.classList.remove('jumping', 'jump-phase-land', 'jump-land');
    await this.turnToFront();
    picoFigure.classList.add('idle');

    if (!isBubbleOpen) {
      IdleBlink.resume();
      IdleAttention.onUserDisengage(1500);
    }
    this.scheduleNextWander();

    return this.currentX;
  },

  // Multi-Surface Traversal Coordinator
  async traverseToSurface(targetSurfaceId, targetX = null) {
    if (this.currentSurfaceId === targetSurfaceId) {
      if (targetX !== null) {
        return await this.walkTo(targetX);
      }
      return this.currentX;
    }

    const path = SurfaceManager.findNavigationPath(
      this.currentSurfaceId,
      this.currentX,
      targetSurfaceId,
      targetX ?? 400
    );

    if (!path || path.length === 0) {
      console.warn('No physical navigation path to surface:', targetSurfaceId);
      return this.currentX;
    }

    for (const step of path) {
      if (step.type === 'walk') {
        await this.walkTo(step.toX);
      } else if (step.transitionType === 'jump_up') {
        await this.jumpToSurface(step.toSurfaceId, step.landingX);
      } else if (step.transitionType === 'drop_down' || step.transitionType === 'hop_down') {
        await this.dropDownToSurface(step.toSurfaceId, step.landingX);
      }
    }

    if (targetX !== null) {
      await this.walkTo(targetX);
    }

    return this.currentX;
  },

  stop() {
    const wasActive = this.isWalking || this.isTurning;
    this.isWalking = false;
    this.isTurning = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.clearStepAnimation();

    // Immediately restore clean front-facing idle standing
    picoFigure.classList.remove(
      'walking', 'turning-to-side', 'turning-to-front', 'turning-around',
      'jump-crouch', 'jump-air-rise', 'jump-air-fall', 'jump-land'
    );
    picoFigure.classList.add('idle');

    if (!isBubbleOpen) {
      IdleBlink.resume();
      IdleAttention.onUserDisengage(1500);
    }

    if (wasActive) {
      this.scheduleNextWander();
    }
  }
};

window.WanderController = WanderController;

// Open attached speech bubble
function openBubble() {
  if (WanderController.isWalking) {
    WanderController.stop();
  }
  IdleAttention.onUserEngage();
  isBubbleOpen = true;
  bubbleContainer.classList.add('open');
  picoCharacter.classList.add('happy');
  CharacterActions.react();

  // Allow interaction while bubble is open
  window.picoAPI?.setIgnoreMouseEvents(false);

  setTimeout(() => {
    picoInput.focus();
  }, 100);
}

// Close attached speech bubble
function closeBubble() {
  isBubbleOpen = false;
  bubbleContainer.classList.remove('open');
  picoCharacter.classList.remove('happy');
  picoInput.blur();

  // Re-enable click-through for desktop transparent areas
  window.picoAPI?.setIgnoreMouseEvents(true, { forward: true });

  // Resume idle blinking and attention shifts
  IdleBlink.resume();
  IdleAttention.onUserDisengage(1200);

  // Schedule next quiet wander
  WanderController.scheduleNextWander();
}

// Toggle bubble on clicking Pico
function toggleBubble(e) {
  e.stopPropagation();
  if (WanderController.isWalking) {
    WanderController.stop();
  }
  if (isBubbleOpen) {
    closeBubble();
  } else {
    openBubble();
  }
}

// Unified Movement Goal Data Model (Goal 3)
class MovementGoal {
  constructor({
    type = 'SHORT',
    direction = null,
    source = 'user',
    targetX = null,
    surfaceId = null,
    interruptible = true,
    directlyAbove = false
  }) {
    this.type = type; // 'SHORT' | 'MEDIUM' | 'LONG' | 'DESTINATION_EDGE' | 'OPPOSITE_EDGE' | 'MAX_EXTENT' | 'CONTINUOUS' | 'CLEAR_VIEW' | 'CANCEL' | 'directional' | 'JUMP_UP' | 'JUMP_LEDGE_ABOVE' | 'JUMP_OTHER_LEDGE' | 'DROP_DOWN'
    this.direction = direction; // 'left' | 'right' | null
    this.source = source; // 'user' | 'autonomous' | 'activity'
    this.targetX = targetX;
    this.surfaceId = surfaceId;
    this.interruptible = interruptible;
    this.directlyAbove = directlyAbove;
    this.createdAt = performance.now();
  }
}

window.MovementGoal = MovementGoal;

// Unified Movement Target Resolver
function resolveMovementTarget(goal, currentX, minX, maxX) {
  if (!goal) return currentX;

  if (goal.targetX !== null && goal.targetX !== undefined && !isNaN(goal.targetX)) {
    return Math.max(minX, Math.min(maxX, Math.round(goal.targetX)));
  }

  // Direction resolution (-1 = left, +1 = right)
  let dir = goal.direction === 'left' ? -1 : (goal.direction === 'right' ? 1 : 0);

  // If direction is unspecified and not an obstruction or cancellation, choose direction with more room
  if (dir === 0 && goal.type !== 'CANCEL' && goal.type !== 'CLEAR_VIEW' && goal.type !== 'OPPOSITE_EDGE') {
    const leftSpace = currentX - minX;
    const rightSpace = maxX - currentX;
    dir = rightSpace >= leftSpace ? 1 : -1;
  }

  switch (goal.type) {
    case 'CANCEL':
      return currentX;

    case 'SHORT':
    case 'directional': {
      // Default short scope (~80px, strictly preserving Milestone 2 baseline)
      const stepDistance = 80;
      return Math.max(minX, Math.min(maxX, currentX + dir * stepDistance));
    }

    case 'MEDIUM': {
      // Medium scope ("walk a bit", "a little"): ~160px
      const stepDistance = 160;
      return Math.max(minX, Math.min(maxX, currentX + dir * stepDistance));
    }

    case 'LONG': {
      // Long scope ("go far", "way right"): ~400px
      const stepDistance = 400;
      return Math.max(minX, Math.min(maxX, currentX + dir * stepDistance));
    }

    case 'DESTINATION_EDGE': {
      // "Go to the right edge" / "walk to the left edge"
      return dir > 0 ? maxX : minX;
    }

    case 'OPPOSITE_EDGE': {
      // "Go to the other edge" / "opposite side"
      const mid = (minX + maxX) / 2;
      return currentX >= mid ? minX : maxX;
    }

    case 'MAX_EXTENT':
    case 'CONTINUOUS': {
      // "Walk all the way left/right", "Keep walking right"
      return dir > 0 ? maxX : minX;
    }

    case 'CLEAR_VIEW': {
      // "Get out of the way" / "blocking view": choose nearest unblocking spot
      const stepDistance = 110;
      const leftRoom = currentX - minX;
      const rightRoom = maxX - currentX;

      let clearDir = -1;
      if (leftRoom >= stepDistance && rightRoom >= stepDistance) {
        clearDir = -1; // Plenty of room: move left away from speech bubble
      } else if (leftRoom >= stepDistance) {
        clearDir = -1;
      } else if (rightRoom >= stepDistance) {
        clearDir = 1;
      } else {
        clearDir = rightRoom > leftRoom ? 1 : -1;
      }

      return Math.max(minX, Math.min(maxX, currentX + clearDir * stepDistance));
    }

    default:
      return Math.max(minX, Math.min(maxX, currentX + dir * 80));
  }
}

// User-Directed Locomotion Intent Controller
const UserMovement = {
  isMovingFromUser: false,

  parseCommand(input) {
    if (!input || typeof input !== 'string') return null;

    const text = input
      .toLowerCase()
      .replace(/[’']/g, "'")
      .replace(/[^a-z0-9\s'-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) return null;

    // 1. Cancellation / Stop (preemption)
    if (/\b(stop|halt|wait|freeze|stay|hold on|don't move|dont move|pause)\b/.test(text)) {
      return { type: 'CANCEL', direction: null };
    }

    // 1b. Jump to the other ledge ("Jump to the other ledge", "Hop to the other ledge", etc.)
    if (/\b(?:other\s+ledge|other\s+shelf|another\s+ledge|another\s+shelf|next\s+ledge|next\s+shelf)\b/.test(text) ||
        /\b(?:jump|hop|leap|go)\s+(?:to|onto)\s+(?:the\s+)?(?:other|another|next)\s+(?:ledge|shelf)\b/.test(text)) {
      return { type: 'JUMP_OTHER_LEDGE', direction: null };
    }

    // 1c. Explicit: Jump to the ledge above me / Go to the ledge above me
    if (/\b(?:ledge|shelf)\s+(?:directly\s+)?above\s+me\b/.test(text) ||
        /\b(?:directly\s+)?above\s+me\b/.test(text)) {
      return { type: 'JUMP_LEDGE_ABOVE', direction: null, directlyAbove: true };
    }

    // 1d. Jump to the ledge above / Hop onto that ledge / Hop up / Jump up
    if (/\b(?:jump|hop|leap|go|climb|vault)\s+(?:to|onto)\s+(?:the\s+)?(?:ledge|shelf)\s+above\b/.test(text) ||
        /\b(?:ledge|shelf)\s+above\b/.test(text) ||
        /\b(?:jump|hop|leap|go)\s+(?:to|onto|on)\s+(?:that|the)\s+(?:ledge|shelf)\b/.test(text) ||
        /\b(?:onto|on)\s+(?:that|the)\s+(?:ledge|shelf)\b/.test(text) ||
        /\b(?:jump up|hop up|leap up|climb up|vault up)\b/.test(text)) {
      return { type: 'JUMP_UP', direction: null };
    }

    // 1e. Drop Down / Come down from the ledge / Return to the taskbar
    if (/\b(?:come\s+down|step\s+down|climb\s+down|down)\s+from\s+(?:the\s+)?(?:ledge|shelf)\b/.test(text) ||
        /\b(?:return\s+to|back\s+to|go\s+to|down\s+to)\s+(?:the\s+)?taskbar\b/.test(text) ||
        /\b(?:jump down|hop down|drop down|come down|step down|climb down|go down|return to taskbar)\b/.test(text)) {
      return { type: 'DROP_DOWN', direction: null };
    }

    // 2. Opposite Edge
    if (/\b(other (?:side|edge)|opposite (?:side|edge))\b/.test(text)) {
      return { type: 'OPPOSITE_EDGE', direction: null };
    }

    const hasLeft = /\bleft\b/.test(text);
    const hasRight = /\bright\b/.test(text);
    let dir = null;
    if (hasLeft && !hasRight) dir = 'left';
    else if (hasRight && !hasLeft) dir = 'right';
    else if (hasLeft && hasRight) dir = text.lastIndexOf('left') > text.lastIndexOf('right') ? 'left' : 'right';

    // 3. Destination Edge / To the edge
    if (/\b(to the (?:right|left) edge|to the edge|to the end)\b/.test(text)) {
      return { type: 'DESTINATION_EDGE', direction: dir || (hasLeft ? 'left' : 'right') };
    }

    // 4. Max Extent / All the way
    if (/\b(all the way|as far as (?:you can|possible))\b/.test(text)) {
      return { type: 'MAX_EXTENT', direction: dir || (hasLeft ? 'left' : 'right') };
    }

    // 5. Continuous Walk
    if (/\b(keep (?:walking|going|moving|stepping)|continue (?:walking|going|moving))\b/.test(text)) {
      return { type: 'CONTINUOUS', direction: dir || (hasLeft ? 'left' : 'right') };
    }

    // 6. Obstruction / Clear View (when no explicit directional movement is requested)
    const isObstruction =
      /\b(out of (?:the |my )?way|in (?:the |my )?way|get out of (?:the |my )?way)\b/.test(text) ||
      /\b(move over|move aside|step aside|scoot over|scoot aside)\b/.test(text) ||
      /\b(blocking|obstructing|hiding)\b/.test(text) ||
      /\b(you'?re|you are)\s+(?:in\s+(?:the|my)\s+way|blocking)\b/.test(text) ||
      /\b(move|go|walk|get)\s+away\b/.test(text);

    if (isObstruction && !dir) {
      return { type: 'CLEAR_VIEW', direction: null };
    }

    // 7. Distance Scopes (Long, Medium, Short)
    const isMovementVerb = /\b(move|go|walk|step|head|shift|scoot|slide|turn|run)\b/.test(text);
    const isFar = /\b(far|a long way|a lot|way)\b/.test(text);
    const isMedium = /\b(a bit|a little|somewhat|a few steps|a step)\b/.test(text);

    if (isFar && (dir || isMovementVerb)) {
      return { type: 'LONG', direction: dir };
    }

    if (isMedium && (dir || isMovementVerb)) {
      return { type: 'MEDIUM', direction: dir };
    }

    if (dir || isMovementVerb || isObstruction) {
      return { type: 'SHORT', direction: dir };
    }

    return null;
  },

  calculateTarget(intent, currentX, minX, maxX) {
    return resolveMovementTarget(intent, currentX, minX, maxX);
  },

  async executeCommand(intent) {
    const goal = new MovementGoal({
      type: intent.type,
      direction: intent.direction,
      source: 'user',
      directlyAbove: intent.directlyAbove || false
    });

    this.isMovingFromUser = true;
    IdleAttention.onUserEngage();

    // Cancellation / Stop handling: immediate execution without delay
    if (goal.type === 'CANCEL') {
      closeBubble();
      await WanderController.executeGoal(goal);
      this.isMovingFromUser = false;
      IdleAttention.onUserDisengage(1500);
      return WanderController.currentX;
    }

    // Sequence:
    // 1. Let nod acknowledgement play (~700ms) to communicate "understood"
    await new Promise(r => setTimeout(r, 700));

    // 2. Smoothly close speech bubble
    closeBubble();

    // 3. Casually walk to target position via unified locomotion engine and return to idle
    const resultX = await WanderController.executeGoal(goal);
    this.isMovingFromUser = false;
    IdleAttention.onUserDisengage(1500);
    return resultX;
  }
};

window.UserMovement = UserMovement;

// Handle message send / acknowledgement & user-directed locomotion
function handleSend() {
  const text = picoInput.value.trim();
  if (!text) return Promise.resolve(null);

  picoInput.value = '';

  const movementIntent = UserMovement.parseCommand(text);

  // Visual character nod & acknowledgement (communicates "heard you / understood")
  CharacterActions.acknowledge();

  if (movementIntent) {
    return UserMovement.executeCommand(movementIntent);
  }

  return Promise.resolve(null);
}

window.submitUserText = async (text) => {
  picoInput.value = text;
  return await handleSend();
};

// Event Listeners
picoContainer.addEventListener('click', toggleBubble);

// Prevent clicks inside speech bubble from closing it
bubbleContainer.addEventListener('click', (e) => {
  e.stopPropagation();
});

// Send on Enter
picoInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleSend();
  }
  if (e.key === 'Escape') {
    closeBubble();
  }
});

sendBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  handleSend();
});

// Click outside closes the bubble
window.addEventListener('click', (e) => {
  if (isBubbleOpen && !e.target.closest('#bubble-container') && !e.target.closest('#pico-container')) {
    closeBubble();
  }
});

// Mouse Event Pass-through handling for transparent window
// State-guarded to prevent IPC flooding and Win32 SetWindowLongPtr compositor stalls
let lastIgnoreState = null;
function setIgnoreMouseEvents(ignore, options) {
  if (lastIgnoreState === ignore) return;
  lastIgnoreState = ignore;
  window.picoAPI?.setIgnoreMouseEvents(ignore, options);
}

picoContainer.addEventListener('mouseenter', () => {
  setIgnoreMouseEvents(false);
  IdleAttention.onUserEngage();
  // Trigger character-like hover acknowledgement once per mouse-enter event
  if (!isBubbleOpen && !CharacterActions.isBusy()) {
    CharacterActions.glance();
  }
});

picoContainer.addEventListener('mouseleave', () => {
  if (!isBubbleOpen) {
    setIgnoreMouseEvents(true, { forward: true });
    IdleAttention.onUserDisengage(1500);
  }
});

bubbleContainer.addEventListener('mouseenter', () => {
  setIgnoreMouseEvents(false);
});

bubbleContainer.addEventListener('mouseleave', () => {
  if (!isBubbleOpen) {
    setIgnoreMouseEvents(true, { forward: true });
  }
});

window.addEventListener('mousemove', (e) => {
  const overPico = !!e.target.closest('#pico-container');
  const overBubble = !!e.target.closest('#bubble-container');
  if (overPico || (isBubbleOpen && overBubble)) {
    setIgnoreMouseEvents(false);
  } else if (!isBubbleOpen) {
    setIgnoreMouseEvents(true, { forward: true });
  }
});

// Initialize natural idle blink loop, autonomous attention controller, and wander controller
IdleBlink.start();
IdleAttention.start();
WanderController.init();

