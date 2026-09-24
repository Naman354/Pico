// DOM Elements
const picoContainer = document.getElementById('pico-container');
const picoFigure = document.getElementById('pico-figure');
const bubbleContainer = document.getElementById('bubble-container');
const picoInput = document.getElementById('pico-input');
const sendBtn = document.getElementById('send-btn');
const picoCharacter = document.getElementById('pico-character');
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
        el.classList.add('idle');
      });
      if (!isBubbleOpen) {
        IdleBlink.resume();
      }
    }, durationMs);
  }
};

window.CharacterActions = CharacterActions;

// Open attached speech bubble
function openBubble() {
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
}

// Toggle bubble on clicking Pico
function toggleBubble(e) {
  e.stopPropagation();
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

// Initialize natural idle blink loop
IdleBlink.start();
