import { renderPicoCharacter } from './pico-svg.js';

// DOM Elements
const picoContainer = document.getElementById('pico-container');
const bubbleContainer = document.getElementById('bubble-container');
const picoInput = document.getElementById('pico-input');
const sendBtn = document.getElementById('send-btn');

// Render Pico Character
picoContainer.innerHTML = renderPicoCharacter();
const picoCharacter = document.querySelector('.pico-character');

let isBubbleOpen = false;
let animationTimeout = null;

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
