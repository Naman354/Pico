// Pico SVG Character Vector Asset - Redesigned Style A
// Scaled for crisp 58-60px desktop height with clear, dark warm outlines for universal readability.

export function renderPicoCharacter() {
  return `
  <div id="pico" class="pico-character idle" title="Pico">
    <svg viewBox="0 0 80 100" class="pico-svg" width="48" height="60" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Gradients for subtle depth while preserving hand-drawn feel -->
        <linearGradient id="hair-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FF7A1A" />
          <stop offset="55%" stop-color="#F25807" />
          <stop offset="100%" stop-color="#C83B00" />
        </linearGradient>

        <linearGradient id="eye-iris" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#1A0A03" />
          <stop offset="60%" stop-color="#3D1807" />
          <stop offset="100%" stop-color="#D97706" />
        </linearGradient>

        <linearGradient id="shirt-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#6F9D6B" />
          <stop offset="100%" stop-color="#517A4D" />
        </linearGradient>

        <linearGradient id="shorts-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FA8F79" />
          <stop offset="100%" stop-color="#E76249" />
        </linearGradient>
      </defs>

      <!-- Pico Rig Root (handles breathing, bouncing, and nodding) -->
      <g class="pico-rig">
        
        <!-- === LOWER BODY: FEET & SHOES === (Soles touch y=100 baseline) -->
        <g id="pico-feet">
          <!-- Left Shoe -->
          <g id="left-shoe">
            <path d="M 23 93 Q 27 89 33 93 L 34 97 Q 27 98 22 97 Z"
                  fill="#E2E8F0" stroke="#334155" stroke-width="1.3" stroke-linejoin="round" />
            <path d="M 21 95 Q 22 92 25 93 L 25 98 Q 22 98 21 95 Z"
                  fill="#FFFFFF" stroke="#334155" stroke-width="1.1" />
            <rect x="21" y="97.5" width="13.5" height="2.5" rx="1.2"
                  fill="#FFFFFF" stroke="#334155" stroke-width="1.2" />
          </g>

          <!-- Right Shoe -->
          <g id="right-shoe">
            <path d="M 47 93 Q 53 89 57 93 L 58 97 Q 53 98 46 97 Z"
                  fill="#E2E8F0" stroke="#334155" stroke-width="1.3" stroke-linejoin="round" />
            <path d="M 55 93 Q 58 92 59 95 L 58 98 Q 55 98 55 93 Z"
                  fill="#FFFFFF" stroke="#334155" stroke-width="1.1" />
            <rect x="45.5" y="97.5" width="13.5" height="2.5" rx="1.2"
                  fill="#FFFFFF" stroke="#334155" stroke-width="1.2" />
          </g>

          <!-- Socks -->
          <rect x="25" y="89" width="6" height="4.5" rx="1" fill="#FFFFFF" stroke="#68250F" stroke-width="1.2" />
          <rect x="49" y="89" width="6" height="4.5" rx="1" fill="#FFFFFF" stroke="#68250F" stroke-width="1.2" />
        </g>

        <!-- Legs (chubby little cartoon boy legs) -->
        <g id="pico-legs">
          <rect x="25.5" y="83" width="5" height="8" rx="2" fill="#FFE5D9" stroke="#68250F" stroke-width="1.2" />
          <rect x="49.5" y="83" width="5" height="8" rx="2" fill="#FFE5D9" stroke="#68250F" stroke-width="1.2" />
        </g>

        <!-- Shorts (Peach/Coral with warm dark outline) -->
        <g id="pico-shorts">
          <path d="M 21 73 L 59 73 L 58 84 L 46 84 L 40 78 L 34 84 L 22 84 Z"
                fill="url(#shorts-grad)" stroke="#682212" stroke-width="1.4" stroke-linejoin="round" />
          <line x1="40" y1="73" x2="40" y2="78" stroke="#682212" stroke-width="1.2" stroke-linecap="round" />
        </g>

        <!-- Torso & Arms (Sage Green T-Shirt with star) -->
        <g id="pico-torso">
          <!-- Left Arm & Hand -->
          <g id="left-arm">
            <path d="M 23 57 L 16 66 L 21 68 L 26 60 Z"
                  fill="#517A4D" stroke="#263D22" stroke-width="1.4" stroke-linejoin="round" />
            <ellipse cx="17.5" cy="71" rx="3.2" ry="3.2" fill="#FFE5D9" stroke="#68250F" stroke-width="1.3" />
          </g>

          <!-- Right Arm & Hand -->
          <g id="right-arm">
            <path d="M 57 57 L 64 66 L 59 68 L 54 60 Z"
                  fill="#517A4D" stroke="#263D22" stroke-width="1.4" stroke-linejoin="round" />
            <ellipse cx="62.5" cy="71" rx="3.2" ry="3.2" fill="#FFE5D9" stroke="#68250F" stroke-width="1.3" />
          </g>

          <!-- T-Shirt Body -->
          <path d="M 22 56 Q 40 53 58 56 L 57 74 Q 40 76 23 74 Z"
                fill="url(#shirt-grad)" stroke="#263D22" stroke-width="1.5" stroke-linejoin="round" />

          <!-- Collar -->
          <path d="M 33 55 Q 40 59 47 55" fill="none" stroke="#263D22" stroke-width="1.4" stroke-linecap="round" />

          <!-- Yellow Star Motif -->
          <g transform="translate(40, 65) scale(0.72)">
            <polygon points="0,-6 1.8,-1.8 6.2,-1.8 2.6,0.9 4,5.3 0,2.6 -4,5.3 -2.6,0.9 -6.2,-1.8 -1.8,-1.8"
                     fill="#FDE047" stroke="#CA8A04" stroke-width="1" stroke-linejoin="round" />
          </g>
        </g>

        <!-- === HEAD & HAIR (Noticeably oversized, ~50-55% of character height) === -->
        <g id="pico-head" class="pico-head">
          <!-- Neck -->
          <rect x="36" y="51" width="8" height="6" rx="2" fill="#FDD3BA" stroke="#68250F" stroke-width="1.2" />

          <!-- Back Hair Volume (Deep layer creating organic depth) -->
          <path d="M 12 38
                   C 6 24 14 10 28 6
                   C 36 3 44 3 52 6
                   C 66 10 74 24 68 38
                   C 73 48 67 56 62 57
                   L 18 57
                   C 13 56 7 48 12 38 Z"
                fill="#B8380A" stroke="#501604" stroke-width="1.8" stroke-linejoin="round" />

          <!-- Ears -->
          <ellipse cx="14" cy="42" rx="4" ry="4.5" fill="#FFE5D9" stroke="#68250F" stroke-width="1.3" />
          <ellipse cx="15" cy="42" rx="2" ry="2.5" fill="#F9A88F" />

          <ellipse cx="66" cy="42" rx="4" ry="4.5" fill="#FFE5D9" stroke="#68250F" stroke-width="1.3" />
          <ellipse cx="65" cy="42" rx="2" ry="2.5" fill="#F9A88F" />

          <!-- Chubby Chibi Face Canvas -->
          <path d="M 16 38
                   C 13 54 23 58 40 58
                   C 57 58 67 54 64 38
                   C 64 24 57 21 40 21
                   C 23 21 16 24 16 38 Z"
                fill="#FFE5D9" stroke="#68250F" stroke-width="1.6" stroke-linejoin="round" />

          <!-- Soft Rosy Pink Cheeks -->
          <ellipse cx="23" cy="47" rx="5.8" ry="3.4" fill="#FF7582" opacity="0.65" class="pico-blush" />
          <ellipse cx="57" cy="47" rx="5.8" ry="3.4" fill="#FF7582" opacity="0.65" class="pico-blush" />

          <!-- Button Nose -->
          <circle cx="40" cy="44.5" r="1.3" fill="#B84B18" />

          <!-- === EYES: Idle State (Large, open, expressive anime/chibi eyes) === -->
          <g class="pico-eyes-idle">
            <!-- Eyebrows -->
            <path d="M 23 27 Q 29 24 35 27" stroke="#68250F" stroke-width="1.7" stroke-linecap="round" fill="none" />
            <path d="M 45 27 Q 51 24 57 27" stroke="#68250F" stroke-width="1.7" stroke-linecap="round" fill="none" />

            <!-- Left Eye -->
            <g class="pico-eye left-eye">
              <!-- Iris Background -->
              <ellipse cx="29" cy="38" rx="6" ry="7.5" fill="url(#eye-iris)" stroke="#1F0B03" stroke-width="1.3" />
              <!-- Top Eyelash / Lid Line (High arch, not hooded) -->
              <path d="M 22 32 Q 29 28 36 32" stroke="#1F0B03" stroke-width="2.2" stroke-linecap="round" fill="none" />
              <!-- Amber Lower Iris Glow -->
              <path d="M 24.5 41 Q 29 44.5 33.5 41" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" fill="none" />
              <!-- Big Specular Reflection (Bright White Highlight) -->
              <circle cx="27" cy="34" r="2.6" fill="#FFFFFF" />
              <!-- Small Secondary Sparkle -->
              <circle cx="32" cy="41" r="1.3" fill="#FFFFFF" />
            </g>

            <!-- Right Eye -->
            <g class="pico-eye right-eye">
              <!-- Iris Background -->
              <ellipse cx="51" cy="38" rx="6" ry="7.5" fill="url(#eye-iris)" stroke="#1F0B03" stroke-width="1.3" />
              <!-- Top Eyelash / Lid Line (High arch, not hooded) -->
              <path d="M 44 32 Q 51 28 58 32" stroke="#1F0B03" stroke-width="2.2" stroke-linecap="round" fill="none" />
              <!-- Amber Lower Iris Glow -->
              <path d="M 46.5 41 Q 51 44.5 55.5 41" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" fill="none" />
              <!-- Big Specular Reflection (Bright White Highlight) -->
              <circle cx="49" cy="34" r="2.6" fill="#FFFFFF" />
              <!-- Small Secondary Sparkle -->
              <circle cx="54" cy="41" r="1.3" fill="#FFFFFF" />
            </g>
          </g>

          <!-- === EYES: Happy / Reaction State (Curved joyful ^ ^ arches) === -->
          <g class="pico-eyes-happy">
            <path d="M 22 38 Q 29 28 36 38" stroke="#1F0B03" stroke-width="2.8" stroke-linecap="round" fill="none" />
            <path d="M 44 38 Q 51 28 58 38" stroke="#1F0B03" stroke-width="2.8" stroke-linecap="round" fill="none" />
            <path d="M 23 27 Q 29 24 35 27" stroke="#68250F" stroke-width="1.6" stroke-linecap="round" fill="none" />
            <path d="M 45 27 Q 51 24 57 27" stroke="#68250F" stroke-width="1.6" stroke-linecap="round" fill="none" />
          </g>

          <!-- Mouth: Idle Gentle Smile -->
          <path class="pico-mouth-idle" d="M 36 50.5 Q 40 53.5 44 50.5" stroke="#881B1B" stroke-width="1.8" stroke-linecap="round" fill="none" />

          <!-- Mouth: Happy Open Smile -->
          <g class="pico-mouth-happy">
            <path d="M 35 48.5 Q 40 55.5 45 48.5 Z" fill="#881B1B" stroke="#6B1313" stroke-width="1" />
            <path d="M 36.5 51 Q 40 54 43.5 51" fill="#FF7582" />
          </g>

          <!-- === FRONT HAIR (Layered, messy, organic tufts with Style A spiky crown) === -->
          <g id="front-hair">
            <!-- Main Hair Volume with jagged, fluffy silhouette -->
            <path d="M 12 36
                     C 8 26 12 14 24 8
                     C 30 5 38 4 46 6
                     C 56 4 68 12 68 26
                     C 72 34 67 43 63 45
                     C 63 38 60 31 57 28
                     C 54 34 50 36 46 31
                     C 43 25 39 23 35 30
                     C 32 35 28 35 24 29
                     C 21 34 18 36 15 34
                     C 13 40 11 39 11 36 Z"
                  fill="url(#hair-grad)" stroke="#501604" stroke-width="1.7" stroke-linejoin="round" />

            <!-- Prominent Style A Crown Spikes -->
            <!-- Tall center-right cowlick tuft pointing up -->
            <path d="M 38 7 C 36 -1 46 -3 50 3 C 47 5 44 6 38 7 Z"
                  fill="#FF8A29" stroke="#501604" stroke-width="1.5" stroke-linejoin="round" />
            <!-- Secondary top-right spike -->
            <path d="M 49 4 C 57 -1 64 3 58 10 C 55 8 52 6 49 4 Z"
                  fill="#FF8A29" stroke="#501604" stroke-width="1.4" stroke-linejoin="round" />
            <!-- Top-left tuft -->
            <path d="M 26 10 C 19 2 30 1 35 7 C 32 8 29 9 26 10 Z"
                  fill="#FF8A29" stroke="#501604" stroke-width="1.4" stroke-linejoin="round" />

            <!-- Fluffy side wing locks near ears -->
            <path d="M 11 27 C 3 28 5 36 12 37 C 10 33 10 30 11 27 Z"
                  fill="#F25807" stroke="#501604" stroke-width="1.5" stroke-linejoin="round" />
            <path d="M 68 24 C 76 26 76 34 67 35 C 68 31 68 27 68 24 Z"
                  fill="#F25807" stroke="#501604" stroke-width="1.5" stroke-linejoin="round" />

            <!-- Warm organic hair strand highlights -->
            <path d="M 28 14 Q 36 9 47 12" stroke="#FED7AA" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.9" />
            <path d="M 52 14 Q 60 14 63 21" stroke="#FED7AA" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.9" />
            <path d="M 20 18 Q 25 14 29 21" stroke="#FED7AA" stroke-width="1.4" stroke-linecap="round" fill="none" opacity="0.8" />
          </g>

        </g>
      </g>
    </svg>
  </div>
  `;
}
