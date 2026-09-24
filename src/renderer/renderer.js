// DOM Elements
const picoContainer = document.getElementById('pico-container');
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

  endBlink() {
    this.isBlinking = false;
    picoContainer.classList.remove('blinking');
    if (this.durationTimer) {
      clearTimeout(this.durationTimer);
      this.durationTimer = null;
    }
  },

  isBusy() {
    if (!picoCharacter) return false;
    return (
      picoCharacter.classList.contains('reacting') ||
      picoCharacter.classList.contains('acknowledging') ||
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
    if (!picoCharacter) return;
    this.playAnimation('reacting', 550);
  },

  // Subtle nod + warm smile to acknowledge user input (pure animation, zero text)
  acknowledge() {
    if (!picoCharacter) return;
    this.playAnimation('acknowledging', 650);
  },

  playAnimation(className, durationMs) {
    // Blinking pauses/overrides while high-priority animations play
    IdleBlink.pauseAndOverride();

    if (animationTimeout) {
      clearTimeout(animationTimeout);
      animationTimeout = null;
    }
    picoCharacter.classList.remove('reacting', 'acknowledging');
    // Force DOM reflow to restart CSS animation cleanly
    void picoCharacter.offsetWidth;
    picoCharacter.classList.add(className);

    animationTimeout = setTimeout(() => {
      picoCharacter.classList.remove(className);
      if (!isBubbleOpen) {
        IdleBlink.resume();
      }
    }, durationMs);
  }
};

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
