// DOM Elements
const desktopStage = document.getElementById('desktop-stage');
const picoContainer = document.getElementById('pico-container');
const picoFacer = document.getElementById('pico-facer');
const picoFigure = document.getElementById('pico-figure');
const bubbleContainer = document.getElementById('bubble-container');
const picoInput = document.getElementById('pico-input');
const sendBtn = document.getElementById('send-btn');
const picoCharacter = document.getElementById('pico-character');
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

// Character Animation Controller (Clean visual isolation)
const CharacterActions = {
  // Playful bounce on click
  react() {
    this.playAnimation('reacting', 550);
  },

  // Subtle character nod + closed-eye acknowledgement to communicate "heard you"
  acknowledge() {
    IdleBlink.pauseAndOverride();

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
        el.classList.add('idle');
      });
      picoContainer.classList.remove('blinking');
      if (!isBubbleOpen) {
        IdleBlink.resume();
      }
    }, 800);
  },

  // Small, character-like acknowledgement when cursor enters Pico's hit area
  glance() {
    if (this.isBusy()) return;
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
      }
    }, durationMs);
  }
};

window.CharacterActions = CharacterActions;

// Autonomous Taskbar Wandering & Locomotion Controller
const WanderController = {
  currentX: 0,
  minX: 30,
  maxX: 1200,
  isWalking: false,
  isTurning: false,
  currentFacing: 'right', // 'right' or 'left'
  wanderTimer: null,
  animFrameId: null,
  stepTimer: null,
  stepPhase: 0,

  async init() {
    try {
      if (window.picoAPI?.getTaskbarSurface) {
        const surface = await window.picoAPI.getTaskbarSurface().catch(() => null);
        if (surface) {
          this.minX = surface.minX ?? 30;
          this.maxX = surface.maxX ?? Math.max(300, window.innerWidth - 280);
          this.currentX = surface.defaultX ?? Math.max(this.minX, this.maxX - 40);
        } else {
          this.minX = 30;
          this.maxX = Math.max(300, window.innerWidth - 280);
          this.currentX = this.maxX - 40;
        }
      } else {
        this.minX = 30;
        this.maxX = Math.max(300, window.innerWidth - 280);
        this.currentX = this.maxX - 40;
      }
    } catch {
      this.minX = 30;
      this.maxX = Math.max(300, window.innerWidth - 280);
      this.currentX = this.maxX - 40;
    }

    this.setStageX(this.currentX);
    this.scheduleNextWander();
  },

  setStageX(x) {
    this.currentX = Math.round(x);
    if (desktopStage) {
      desktopStage.style.transform = `translateX(${this.currentX}px)`;
    }
  },

  scheduleNextWander() {
    this.clearWanderTimer();
    // Restrained, occasional wander: 20s to 42s between decisions
    const delayMs = Math.floor(20000 + Math.random() * 22000);
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

  maybeWander() {
    // If Pico is talking, being clicked, or hovering: quietly postpone
    if (this.isWalking || this.isTurning || isBubbleOpen || CharacterActions.isBusy()) {
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
    if (this.isWalking || this.isTurning || isBubbleOpen || CharacterActions.isBusy()) return;

    // Pick a gentle, short walk distance between 60px and 130px
    const distance = Math.floor(60 + Math.random() * 70);

    // Direction selection respecting boundaries
    let dir = Math.random() < 0.5 ? -1 : 1;
    if (this.currentX - distance < this.minX) {
      dir = 1;
    } else if (this.currentX + distance > this.maxX) {
      dir = -1;
    }

    let targetX = this.currentX + distance * dir;
    targetX = Math.max(this.minX, Math.min(this.maxX, targetX));

    if (Math.abs(targetX - this.currentX) < 20) {
      this.scheduleNextWander();
      return;
    }

    this.walkTo(targetX);
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
      this.stopStepCycle();

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
      this.stopStepCycle();

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

  async walkTo(targetX, speedPxPerSec = 28) {
    if (this.isWalking) {
      this.stop();
    }

    targetX = Math.max(this.minX, Math.min(this.maxX, Math.round(targetX)));
    const startX = this.currentX;
    const distance = targetX - startX;
    if (Math.abs(distance) < 2) return Promise.resolve(this.currentX);

    this.clearWanderTimer();

    // Pause idle breathing and blinking during walking
    IdleBlink.pauseAndOverride();
    picoFigure.classList.remove('idle', 'glancing', 'reacting', 'acknowledging');

    const targetDirection = distance > 0 ? 'right' : 'left';

    // 1. Turning: if idle front-facing, transition to side profile
    if (!picoFigure.classList.contains('walking')) {
      await this.turnToSide(targetDirection);
    } else if (this.currentFacing !== targetDirection) {
      // Reversing direction while already in side stance
      await this.turnAround(targetDirection);
    }

    this.isWalking = true;
    this.startStepCycle();

    const durationMs = Math.max(500, (Math.abs(distance) / speedPxPerSec) * 1000);
    const startTime = performance.now();

    return new Promise((resolve) => {
      const step = async (currentTime) => {
        if (!this.isWalking) {
          resolve(this.currentX);
          return;
        }

        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / durationMs);

        // Gentle ease-in-out for starting and stopping naturally
        const easedProgress = progress < 0.5 
          ? 2 * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const newX = startX + distance * easedProgress;
        this.setStageX(newX);

        if (progress < 1) {
          this.animFrameId = requestAnimationFrame(step);
        } else {
          this.setStageX(targetX);
          this.isWalking = false;
          this.stopStepCycle();

          // 4. Stopping: naturally transition back to front-facing idle stance
          await this.turnToFront();

          if (!isBubbleOpen) {
            IdleBlink.resume();
          }

          this.scheduleNextWander();
          resolve(this.currentX);
        }
      };

      this.animFrameId = requestAnimationFrame(step);
    });
  },

  startStepCycle() {
    this.stopStepCycle();
    this.stepPhase = 0;
    // Step cadence: alternates every ~180ms between passing, step 1, passing, step 2
    // Full walk cycle = 720ms, perfectly synchronized with 0.72s CSS body sway
    this.stepTimer = setInterval(() => {
      if (!this.isWalking || this.isTurning) {
        this.stopStepCycle();
        return;
      }
      this.stepPhase = (this.stepPhase + 1) % 4;
      picoFigure.classList.remove('walk-step-1', 'walk-step-2');
      if (this.stepPhase === 1) {
        picoFigure.classList.add('walk-step-1');
      } else if (this.stepPhase === 3) {
        picoFigure.classList.add('walk-step-2');
      }
    }, 180);
  },

  stopStepCycle() {
    if (this.stepTimer) {
      clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
    picoFigure.classList.remove('walk-step-1', 'walk-step-2');
  },

  stop() {
    const wasActive = this.isWalking || this.isTurning;
    this.isWalking = false;
    this.isTurning = false;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.stopStepCycle();

    // Immediately restore clean front-facing idle standing
    picoFigure.classList.remove('walking', 'turning-to-side', 'turning-to-front', 'turning-around');
    picoFigure.classList.add('idle');

    if (!isBubbleOpen) {
      IdleBlink.resume();
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

  // Resume idle blinking
  IdleBlink.resume();

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

// Handle message send / acknowledgement
function handleSend() {
  const text = picoInput.value.trim();
  if (!text) return;

  // Visual character nod & smile (no text description)
  CharacterActions.acknowledge();
  picoInput.value = '';
}

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
picoContainer.addEventListener('mouseenter', () => {
  window.picoAPI?.setIgnoreMouseEvents(false);
  if (WanderController.isWalking) {
    WanderController.stop();
  }
  // Trigger character-like hover acknowledgement once per mouse-enter event
  if (!isBubbleOpen && !CharacterActions.isBusy()) {
    CharacterActions.glance();
  }
});

picoContainer.addEventListener('mouseleave', () => {
  if (!isBubbleOpen) {
    window.picoAPI?.setIgnoreMouseEvents(true, { forward: true });
  }
});

bubbleContainer.addEventListener('mouseenter', () => {
  window.picoAPI?.setIgnoreMouseEvents(false);
});

bubbleContainer.addEventListener('mouseleave', () => {
  if (!isBubbleOpen) {
    window.picoAPI?.setIgnoreMouseEvents(true, { forward: true });
  }
});

window.addEventListener('mousemove', (e) => {
  const overPico = !!e.target.closest('#pico-container');
  const overBubble = !!e.target.closest('#bubble-container');
  if (overPico || (isBubbleOpen && overBubble)) {
    window.picoAPI?.setIgnoreMouseEvents(false);
  } else if (!isBubbleOpen) {
    window.picoAPI?.setIgnoreMouseEvents(true, { forward: true });
  }
});

// Initialize natural idle blink loop and autonomous wander controller
IdleBlink.start();
WanderController.init();

