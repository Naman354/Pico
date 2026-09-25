const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 800, height: 600 });
  await win.loadURL('about:blank');

  const idleB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-idle.png')).toString('base64');
  const leftEyesB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-eyes-left.png')).toString('base64');
  const rightEyesB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-eyes-right.png')).toString('base64');
  const downEyesB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-eyes-down.png')).toString('base64');
  const blinkB64 = fs.readFileSync(path.join(__dirname, 'src/renderer/pico-blink.png')).toString('base64');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { background: #0f172a; margin: 0; padding: 40px; font-family: sans-serif; color: white; }
        .rig-container {
          display: flex;
          gap: 30px;
          align-items: flex-end;
        }
        .card {
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
          width: 130px;
        }
        .stage {
          position: relative;
          width: 38px;
          height: 60px;
          margin: 10px auto;
          /* Red baseline */
          border-bottom: 2px solid #ef4444;
        }
        .pico-figure {
          position: relative;
          width: 38px;
          height: 60px;
          transform-origin: center bottom;
        }
        /* Body layer: torso, shorts, legs, shoes */
        .pico-body {
          position: absolute;
          top: 0;
          left: 0;
          width: 38px;
          height: 60px;
          clip-path: polygon(0 58%, 100% 58%, 100% 100%, 0 100%);
        }
        /* Head layer: hair, face, ears, chin */
        .pico-head {
          position: absolute;
          top: 0;
          left: 0;
          width: 38px;
          height: 60px;
          clip-path: polygon(0 0, 100% 0, 100% 60%, 0 60%);
          transform-origin: 19px 35.6px; /* Neck pivot */
          transition: transform 0.4s ease;
        }
        .sprite {
          position: absolute;
          top: 0;
          left: 0;
          width: 38px;
          height: 60px;
          image-rendering: -webkit-optimize-contrast;
        }
        .overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 38px;
          height: 60px;
          opacity: 0;
          pointer-events: none;
        }
        /* State classes */
        .gaze-left .eyes-left { opacity: 1; }
        .gaze-right .eyes-right { opacity: 1; }
        .gaze-down .eyes-down { opacity: 1; }
        .blinking .blink-overlay { opacity: 1; }

        .head-left { transform: rotate(-6deg); }
        .head-right { transform: rotate(6deg); }
        .head-down { transform: rotate(2deg) translateY(0.5px); }
        .head-tilt { transform: rotate(5deg); }

        .title { font-size: 11px; font-weight: bold; margin-bottom: 4px; color: #38bdf8; }
        .desc { font-size: 9px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <h2 style="font-size: 16px; margin-bottom: 20px;">Idle Attention Shift & Head/Eye Rig Preview</h2>
      <div class="rig-container">
        
        <!-- 1. Neutral Forward -->
        <div class="card">
          <div class="title">1. Forward Idle</div>
          <div class="desc">Quiet neutral stare</div>
          <div class="stage">
            <div class="pico-figure">
              <div class="pico-body"><img class="sprite" src="data:image/png;base64,${idleB64}" /></div>
              <div class="pico-head">
                <img class="sprite" src="data:image/png;base64,${idleB64}" />
                <img class="overlay blink-overlay" src="data:image/png;base64,${blinkB64}" />
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Glance Left (Eyes only) -->
        <div class="card">
          <div class="title">2. Glance Left</div>
          <div class="desc">Eyes only (-2.2px)</div>
          <div class="stage">
            <div class="pico-figure gaze-left">
              <div class="pico-body"><img class="sprite" src="data:image/png;base64,${idleB64}" /></div>
              <div class="pico-head">
                <img class="sprite" src="data:image/png;base64,${idleB64}" />
                <img class="overlay eyes-left" src="data:image/png;base64,${leftEyesB64}" />
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Look Left (Eyes + Head Turn) -->
        <div class="card">
          <div class="title">3. Head Turn Left</div>
          <div class="desc">Eyes left + 6° head turn</div>
          <div class="stage">
            <div class="pico-figure gaze-left">
              <div class="pico-body"><img class="sprite" src="data:image/png;base64,${idleB64}" /></div>
              <div class="pico-head head-left">
                <img class="sprite" src="data:image/png;base64,${idleB64}" />
                <img class="overlay eyes-left" src="data:image/png;base64,${leftEyesB64}" />
              </div>
            </div>
          </div>
        </div>

        <!-- 4. Glance Right (Eyes only) -->
        <div class="card">
          <div class="title">4. Glance Right</div>
          <div class="desc">Eyes only (+2.2px)</div>
          <div class="stage">
            <div class="pico-figure gaze-right">
              <div class="pico-body"><img class="sprite" src="data:image/png;base64,${idleB64}" /></div>
              <div class="pico-head">
                <img class="sprite" src="data:image/png;base64,${idleB64}" />
                <img class="overlay eyes-right" src="data:image/png;base64,${rightEyesB64}" />
              </div>
            </div>
          </div>
        </div>

        <!-- 5. Look Right (Eyes + Head Turn) -->
        <div class="card">
          <div class="title">5. Head Turn Right</div>
          <div class="desc">Eyes right + 6° head turn</div>
          <div class="stage">
            <div class="pico-figure gaze-right">
              <div class="pico-body"><img class="sprite" src="data:image/png;base64,${idleB64}" /></div>
              <div class="pico-head head-right">
                <img class="sprite" src="data:image/png;base64,${idleB64}" />
                <img class="overlay eyes-right" src="data:image/png;base64,${rightEyesB64}" />
              </div>
            </div>
          </div>
        </div>

        <!-- 6. Glance Down -->
        <div class="card">
          <div class="title">6. Glance Down</div>
          <div class="desc">Eyes down + 2° chin tuck</div>
          <div class="stage">
            <div class="pico-figure gaze-down">
              <div class="pico-body"><img class="sprite" src="data:image/png;base64,${idleB64}" /></div>
              <div class="pico-head head-down">
                <img class="sprite" src="data:image/png;base64,${idleB64}" />
                <img class="overlay eyes-down" src="data:image/png;base64,${downEyesB64}" />
              </div>
            </div>
          </div>
        </div>

        <!-- 7. Tiny Head Tilt -->
        <div class="card">
          <div class="title">7. Tiny Head Tilt</div>
          <div class="desc">Curious tilt (5°)</div>
          <div class="stage">
            <div class="pico-figure">
              <div class="pico-body"><img class="sprite" src="data:image/png;base64,${idleB64}" /></div>
              <div class="pico-head head-tilt">
                <img class="sprite" src="data:image/png;base64,${idleB64}" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </body>
    </html>
  `;

  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  await new Promise(r => setTimeout(r, 600));

  const image = await win.webContents.capturePage();
  fs.writeFileSync(path.join(__dirname, 'rig-preview.png'), image.toPNG());
  console.log('Saved rig-preview.png');
  app.quit();
});
