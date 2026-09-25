function parseMovementCommand(input) {
  if (!input || typeof input !== 'string') return null;
  const text = input
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;

  const hasLeft = /\bleft\b/.test(text);
  const hasRight = /\bright\b/.test(text);

  if (hasLeft && !hasRight) {
    const isLeftMovement = 
      /\b(move|go|walk|step|head|shift|scoot|slide|turn|run)\b.*?\bleft\b/.test(text) ||
      /\bleft\b.*?\b(side|please|now)\b/.test(text) ||
      /^(?:please\s+)?(?:move\s+)?left(?:\s+please)?$/.test(text);
    if (isLeftMovement) return { type: 'directional', direction: 'left' };
  }

  if (hasRight && !hasLeft) {
    const isRightMovement = 
      /\b(move|go|walk|step|head|shift|scoot|slide|turn|run)\b.*?\bright\b/.test(text) ||
      /\bright\b.*?\b(side|please|now)\b/.test(text) ||
      /^(?:please\s+)?(?:move\s+)?right(?:\s+please)?$/.test(text);
    if (isRightMovement) return { type: 'directional', direction: 'right' };
  }

  if (hasLeft && hasRight) {
    const lastLeft = text.lastIndexOf('left');
    const lastRight = text.lastIndexOf('right');
    return { type: 'directional', direction: lastLeft > lastRight ? 'left' : 'right' };
  }

  const isObstruction = 
    /\b(out of (?:the |my )?way|in (?:the |my )?way|get out of (?:the |my )?way)\b/.test(text) ||
    /\b(move over|move aside|step aside|scoot over|scoot aside)\b/.test(text) ||
    /\b(blocking|obstructing|hiding)\b/.test(text) ||
    /\b(you'?re|you are)\s+(?:in\s+(?:the|my)\s+way|blocking)\b/.test(text) ||
    /\b(move|go|walk|get)\s+away\b/.test(text) ||
    /^(?:please\s+)?(?:move|scoot|step)(?:\s+over|\s+aside|\s+please)?$/.test(text) ||
    /\b(can you|could you|please)\s+(?:move|step aside|scoot)\b/.test(text);

  if (isObstruction) return { type: 'clear_view' };
  return null;
}

const tests = [
  'Move left.',
  'Move right.',
  'Go left.',
  'Go right.',
  'Move over.',
  'Get out of the way.',
  'You’re blocking it.',
  'Move out of the way.',
  'You’re blocking my view. Move left.',
  'You are blocking it. Move right.',
  'Please move left',
  'can you move right please',
  'scoot over',
  'step aside',
  'you are in the way',
  'Get out of my way!',
  'Hello Pico!',
  'Good morning'
];

for (const t of tests) {
  console.log(t.padEnd(40, ' '), '=>', JSON.stringify(parseMovementCommand(t)));
}
