// Pico SVG Character Vector Asset - Authoritative New Character Sheet (Style A)
// Exact proportions: 60px visible desktop height, ~52% oversized head, messy organic orange hair,
// large expressive anime eyes, rosy blush, sage green shirt with TWO chest stars, coral shorts,
// grey/white sneakers, and consistent dark warm outlines (#2E1408) for universal readability.

export function renderPicoCharacter() {
  return `
  <div id="pico" class="pico-character idle" title="Pico">
    <svg viewBox="0 0 80 100" class="pico-svg" width="48" height="60" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Hair Gradient matching Character Sheet Palette: #D9531E to #FA7921 to #F59E56 -->
        <linearGradient id="hair-base-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FA7921" />
          <stop offset="45%" stop-color="#E85D04" />
          <stop offset="100%" stop-color="#C84400" />
        </linearGradient>

        <!-- Eye Iris Gradient: Deep espresso #240D04 to amber #D97706 -->
        <linearGradient id="iris-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#1F0A02" />
          <stop offset="55%" stop-color="#3D1807" />
          <stop offset="100%" stop-color="#D97706" />
        </linearGradient>

        <!-- Shirt Sage Green: #5E855A -->
        <linearGradient id="shirt-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#6E976A" />
          <stop offset="100%" stop-color="#4E784A" />
        </linearGradient>

        <!-- Shorts Peach/Coral: #F38375 -->
        <linearGradient id="shorts-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FA8F79" />
          <stop offset="100%" stop-color="#E66752" />
        </linearGradient>
      </defs>

      <!-- Pico Animation Rig Root -->
      <g class="pico-rig">
        
        <!-- ========================================== -->
        <!-- LOWER BODY: SNEAKERS & SOCKS (y=89 to 100) -->
        <!-- Soles sit directly on y=100 baseline       -->
        <!-- ========================================== -->
        <g id="pico-shoes">
          <!-- Left Sneaker (Warm grey body, white toe cap & rubber sole) -->
          <g id="left-sneaker">
            <!-- Sneaker body (taupe/grey #A8A29E) -->
            <path d="M 23 92 Q 28 89 33 92 L 34 97 Q 27 98 22 97 Z"
                  fill="#A8A29E" stroke="#2E1408" stroke-width="1.4" stroke-linejoin="round" />
            <!-- White rubber toe cap -->
            <path d="M 21 95 Q 22 91.5 25.5 92.5 L 25.5 97.5 Q 22 97.5 21 95 Z"
                  fill="#FFFFFF" stroke="#2E1408" stroke-width="1.2" />
            <!-- White lace/tongue accent -->
            <path d="M 26 92.5 L 30 92.5" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" />
            <!-- Rubber sole resting exactly on y=100 surface -->
            <rect x="20.5" y="97.2" width="14" height="2.8" rx="1.2"
                  fill="#FFFFFF" stroke="#2E1408" stroke-width="1.3" />
          </g>

          <!-- Right Sneaker -->
          <g id="right-sneaker">
            <!-- Sneaker body -->
            <path d="M 47 92 Q 52 89 57 92 L 58 97 Q 53 98 46 97 Z"
                  fill="#A8A29E" stroke="#2E1408" stroke-width="1.4" stroke-linejoin="round" />
            <!-- White rubber toe cap -->
            <path d="M 54.5 92.5 Q 58 91.5 59 95 Q 58 97.5 54.5 97.5 Z"
                  fill="#FFFFFF" stroke="#2E1408" stroke-width="1.2" />
            <!-- White lace accent -->
            <path d="M 50 92.5 L 54 92.5" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" />
            <!-- Rubber sole resting exactly on y=100 surface -->
            <rect x="45.5" y="97.2" width="14" height="2.8" rx="1.2"
                  fill="#FFFFFF" stroke="#2E1408" stroke-width="1.3" />
          </g>

          <!-- White Ankle Socks -->
          <rect x="25" y="88" width="6" height="4.5" rx="1" fill="#FFFFFF" stroke="#2E1408" stroke-width="1.2" />
          <rect x="49" y="88" width="6" height="4.5" rx="1" fill="#FFFFFF" stroke="#2E1408" stroke-width="1.2" />
        </g>

        <!-- Chubby Little Boy Legs -->
        <g id="pico-legs">
          <rect x="25.5" y="82" width="5" height="7.5" rx="2" fill="#FEEAE0" stroke="#2E1408" stroke-width="1.3" />
          <rect x="49.5" y="82" width="5" height="7.5" rx="2" fill="#FEEAE0" stroke="#2E1408" stroke-width="1.3" />
        </g>

        <!-- Shorts (Peach/Coral #F38375 with clean dark warm outline) -->
        <g id="pico-shorts">
          <path d="M 21 72 L 59 72 L 58 83 L 46 83 L 40 77 L 34 83 L 22 83 Z"
                fill="url(#shorts-grad)" stroke="#2E1408" stroke-width="1.5" stroke-linejoin="round" />
          <!-- Center seam -->
          <line x1="40" y1="72" x2="40" y2="77" stroke="#2E1408" stroke-width="1.3" stroke-linecap="round" />
        </g>

        <!-- ========================================== -->
        <!-- TORSO & ARMS: Sage Green T-Shirt (#5E855A) -->
        <!-- With TWO golden-yellow stars on chest      -->
        <!-- ========================================== -->
        <g id="pico-torso">
          <!-- Left Arm & Hand -->
          <g id="left-arm">
            <path d="M 23 57 L 16 66 L 21 68 L 26 60 Z"
                  fill="#4E784A" stroke="#2E1408" stroke-width="1.4" stroke-linejoin="round" />
            <ellipse cx="17" cy="71" rx="3.3" ry="3.3" fill="#FEEAE0" stroke="#2E1408" stroke-width="1.3" />
          </g>

          <!-- Right Arm & Hand -->
          <g id="right-arm">
            <path d="M 57 57 L 64 66 L 59 68 L 54 60 Z"
                  fill="#4E784A" stroke="#2E1408" stroke-width="1.4" stroke-linejoin="round" />
            <ellipse cx="63" cy="71" rx="3.3" ry="3.3" fill="#FEEAE0" stroke="#2E1408" stroke-width="1.3" />
          </g>

          <!-- T-Shirt Body -->
          <path d="M 22 56 Q 40 53 58 56 L 57 73 Q 40 75 23 73 Z"
                fill="url(#shirt-grad)" stroke="#2E1408" stroke-width="1.6" stroke-linejoin="round" />

          <!-- Collar (Darker Green Trim #3C5E39) -->
          <path d="M 33 55 Q 40 59 47 55" fill="none" stroke="#2E1408" stroke-width="1.4" stroke-linecap="round" />

          <!-- TWO Yellow Stars Motif (Exact match to Character Sheet Shirt Detail) -->
          <!-- Star 1 (Left, slightly larger) -->
          <g transform="translate(37, 64) scale(0.68)">
            <polygon points="0,-6 1.8,-1.8 6.2,-1.8 2.6,0.9 4,5.3 0,2.6 -4,5.3 -2.6,0.9 -6.2,-1.8 -1.8,-1.8"
                     fill="#F6C445" stroke="#CA8A04" stroke-width="0.9" stroke-linejoin="round" />
          </g>
          <!-- Star 2 (Right, slightly smaller, tilted) -->
          <g transform="translate(44, 63) rotate(14) scale(0.52)">
            <polygon points="0,-6 1.8,-1.8 6.2,-1.8 2.6,0.9 4,5.3 0,2.6 -4,5.3 -2.6,0.9 -6.2,-1.8 -1.8,-1.8"
                     fill="#F6C445" stroke="#CA8A04" stroke-width="0.9" stroke-linejoin="round" />
          </g>
        </g>

        <!-- ========================================== -->
        <!-- HEAD & FACE: Oversized (~52% of character) -->
        <!-- Matches new Character Sheet Face & Eyes    -->
        <!-- ========================================== -->
        <g id="pico-head" class="pico-head">
          <!-- Neck -->
          <rect x="36" y="51" width="8" height="6" rx="2" fill="#FDD3BA" stroke="#2E1408" stroke-width="1.2" />

          <!-- Back Hair Volume (Deep layer creating organic messy depth) -->
          <path d="M 12 38
                   C 6 23 15 9 28 6
                   C 36 3 44 3 52 6
                   C 65 9 74 23 68 38
                   C 73 48 67 56 62 57
                   L 18 57
                   C 13 56 7 48 12 38 Z"
                fill="#C84400" stroke="#2E1408" stroke-width="1.8" stroke-linejoin="round" />

          <!-- Left & Right Ears -->
          <ellipse cx="14" cy="42" rx="4" ry="4.5" fill="#FEEAE0" stroke="#2E1408" stroke-width="1.4" />
          <ellipse cx="15" cy="42" rx="2" ry="2.5" fill="#F9A88F" />

          <ellipse cx="66" cy="42" rx="4" ry="4.5" fill="#FEEAE0" stroke="#2E1408" stroke-width="1.4" />
          <ellipse cx="65" cy="42" rx="2" ry="2.5" fill="#F9A88F" />

          <!-- Chubby Chibi Face Canvas (Peach Skin #FEEAE0) -->
          <path d="M 16 38
                   C 13 54 23 58 40 58
                   C 57 58 67 54 64 38
                   C 64 24 57 21 40 21
                   C 23 21 16 24 16 38 Z"
                fill="#FEEAE0" stroke="#2E1408" stroke-width="1.6" stroke-linejoin="round" />

          <!-- Soft Rosy Blush on both cheeks (#F46A6A) -->
          <ellipse cx="23" cy="47" rx="5.8" ry="3.3" fill="#F46A6A" opacity="0.68" class="pico-blush" />
          <ellipse cx="57" cy="47" rx="5.8" ry="3.3" fill="#F46A6A" opacity="0.68" class="pico-blush" />

          <!-- Cute Button Nose Dot -->
          <circle cx="40" cy="44" r="1.3" fill="#A83F12" />

          <!-- ============================================== -->
          <!-- EYES: Idle State (Large, open, expressive eyes) -->
          <!-- ============================================== -->
          <g class="pico-eyes-idle">
            <!-- Soft arched brown eyebrows -->
            <path d="M 23 27 Q 29 24 35 27" stroke="#6D2810" stroke-width="1.7" stroke-linecap="round" fill="none" />
            <path d="M 45 27 Q 51 24 57 27" stroke="#6D2810" stroke-width="1.7" stroke-linecap="round" fill="none" />

            <!-- Left Eye -->
            <g class="pico-eye left-eye">
              <!-- Rounded Iris -->
              <ellipse cx="29" cy="38" rx="6" ry="7.5" fill="url(#iris-grad)" stroke="#240D04" stroke-width="1.3" />
              <!-- Top Eyelid Line (Thick, dark espresso #240D04) -->
              <path d="M 22 32 Q 29 28 36 32" stroke="#240D04" stroke-width="2.3" stroke-linecap="round" fill="none" />
              <!-- Amber / Honey Lower Glow -->
              <path d="M 24.5 41 Q 29 44.5 33.5 41" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" fill="none" />
              <!-- Primary Specular Highlight (Big bright white dot in upper-left) -->
              <circle cx="27" cy="34" r="2.6" fill="#FFFFFF" />
              <!-- Secondary Specular Sparkle (Small white dot in lower-right) -->
              <circle cx="32" cy="41" r="1.3" fill="#FFFFFF" />
            </g>

            <!-- Right Eye -->
            <g class="pico-eye right-eye">
              <!-- Rounded Iris -->
              <ellipse cx="51" cy="38" rx="6" ry="7.5" fill="url(#iris-grad)" stroke="#240D04" stroke-width="1.3" />
              <!-- Top Eyelid Line -->
              <path d="M 44 32 Q 51 28 58 32" stroke="#240D04" stroke-width="2.3" stroke-linecap="round" fill="none" />
              <!-- Amber / Honey Lower Glow -->
              <path d="M 46.5 41 Q 51 44.5 55.5 41" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" fill="none" />
              <!-- Primary Specular Highlight -->
              <circle cx="49" cy="34" r="2.6" fill="#FFFFFF" />
              <!-- Secondary Specular Sparkle -->
              <circle cx="54" cy="41" r="1.3" fill="#FFFFFF" />
            </g>
          </g>

          <!-- ============================================== -->
          <!-- EYES: Happy / Reaction State (Curved ^ ^ arches) -->
          <!-- ============================================== -->
          <g class="pico-eyes-happy">
            <path d="M 22 38 Q 29 28 36 38" stroke="#240D04" stroke-width="2.8" stroke-linecap="round" fill="none" />
            <path d="M 44 38 Q 51 28 58 38" stroke="#240D04" stroke-width="2.8" stroke-linecap="round" fill="none" />
            <path d="M 23 27 Q 29 24 35 27" stroke="#6D2810" stroke-width="1.6" stroke-linecap="round" fill="none" />
            <path d="M 45 27 Q 51 24 57 27" stroke="#6D2810" stroke-width="1.6" stroke-linecap="round" fill="none" />
          </g>

          <!-- Mouth: Neutral Gentle Smile -->
          <path class="pico-mouth-idle" d="M 36 50.5 Q 40 53.5 44 50.5" stroke="#881B1B" stroke-width="1.8" stroke-linecap="round" fill="none" />

          <!-- Mouth: Happy Open Smile (Shown on reaction / acknowledge) -->
          <g class="pico-mouth-happy">
            <path d="M 35 48.5 Q 40 55.5 45 48.5 Z" fill="#881B1B" stroke="#2E1408" stroke-width="1" />
            <path d="M 36.5 51 Q 40 54 43.5 51" fill="#F46A6A" />
          </g>

          <!-- ============================================== -->
          <!-- FRONT HAIR: Layered, messy, organic tufts       -->
          <!-- Crown cowlick, side tufts, and feathery fringe -->
          <!-- ============================================== -->
          <g id="front-hair">
            <!-- Main Hair Volume with organic, fluffy silhouette -->
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
                  fill="url(#hair-base-grad)" stroke="#2E1408" stroke-width="1.8" stroke-linejoin="round" />

            <!-- Prominent Style A Crown Spikes (Exact cowlick crest) -->
            <!-- Tall center cowlick tuft pointing upward-right -->
            <path d="M 38 7 C 36 -1 46 -3 50 3 C 47 5 44 6 38 7 Z"
                  fill="#F59E56" stroke="#2E1408" stroke-width="1.6" stroke-linejoin="round" />
            <!-- Secondary top-right spike -->
            <path d="M 49 4 C 57 -1 64 3 58 10 C 55 8 52 6 49 4 Z"
                  fill="#F59E56" stroke="#2E1408" stroke-width="1.5" stroke-linejoin="round" />
            <!-- Top-left tuft -->
            <path d="M 26 10 C 19 2 30 1 35 7 C 32 8 29 9 26 10 Z"
                  fill="#F59E56" stroke="#2E1408" stroke-width="1.5" stroke-linejoin="round" />

            <!-- Fluffy side wing locks near ears -->
            <path d="M 11 27 C 3 28 5 36 12 37 C 10 33 10 30 11 27 Z"
                  fill="#E85D04" stroke="#2E1408" stroke-width="1.6" stroke-linejoin="round" />
            <path d="M 68 24 C 76 26 76 34 67 35 C 68 31 68 27 68 24 Z"
                  fill="#E85D04" stroke="#2E1408" stroke-width="1.6" stroke-linejoin="round" />

            <!-- Warm organic hair strand highlights (#F59E56) -->
            <path d="M 28 14 Q 36 9 47 12" stroke="#FFC085" stroke-width="1.8" stroke-linecap="round" fill="none" opacity="0.9" />
            <path d="M 52 14 Q 60 14 63 21" stroke="#FFC085" stroke-width="1.6" stroke-linecap="round" fill="none" opacity="0.9" />
            <path d="M 20 18 Q 25 14 29 21" stroke="#FFC085" stroke-width="1.4" stroke-linecap="round" fill="none" opacity="0.8" />
          </g>

        </g>
      </g>
    </svg>
  </div>
  `;
}
