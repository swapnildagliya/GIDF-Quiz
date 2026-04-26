/* =========================================================================
   GIDF Quiz — Photo-strip selfie
   ---------------------------------------------------------------------------
   Live front-camera + 3-shot burst → photo-booth-style strip with score
   header + GIDF watermark + @gentindiadansfestival footer.
   Output: 1080×1920 PNG (IG Stories aspect).
   Uses MediaDevices.getUserMedia (HTTPS + camera permission required).
   ========================================================================= */
(function(){
  let stream = null;
  let scoreData = null;       // {name, ig, score, total, isWinner}
  let lastBlob = null;
  let isCapturing = false;

  // Strip layout (1080 × 1920)
  const STRIP_W = 1080, STRIP_H = 1920;
  const HEADER_H = 200;
  const FRAME_H  = 480;
  const GAP      = 20;
  const FOOTER_H = STRIP_H - HEADER_H - 3*FRAME_H - 2*GAP; // 240px

  function $(id){ return document.getElementById(id); }
  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  /* --- Open: request camera + show shoot screen --- */
  async function open(data){
    scoreData = data;
    isCapturing = false;
    // Update live overlay text
    $('overlay-score-num').textContent  = data.score;
    $('overlay-score-total').textContent = '/' + data.total;
    $('overlay-handle').textContent      = '@gentindiadansfestival';
    $('overlay-headline').textContent    = data.isWinner
      ? 'Won a free drink at GIDF 2026'
      : 'Took the GIDF 2026 Quiz';

    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      alert("Your browser doesn't support camera access. Try Safari or Chrome on your phone.");
      return;
    }
    try{
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width:  { ideal: 1080 },
          height: { ideal: 1920 }
        },
        audio: false
      });
      const v = $('selfie-video');
      v.srcObject = stream;
      v.setAttribute('playsinline', '');
      v.muted = true;
      await v.play();
      showShootMode();
    } catch(e){
      console.error('Selfie camera failed:', e);
      const msg = (e && e.name === 'NotAllowedError')
        ? "Camera access blocked. Safari → AA icon in URL bar → Website Settings → Camera → Allow. Then try again."
        : "Couldn't start the camera. Try closing other camera apps and reopening this page.";
      alert(msg);
    }
  }

  /* --- Burst capture: 3 frames with countdown + flash --- */
  async function captureBurst(){
    const v = $('selfie-video');
    if(!v || !stream || !v.videoWidth){ alert('Camera not ready — give it a sec.'); return; }
    if(isCapturing) return;
    isCapturing = true;

    const frames = [];
    const indicator = $('selfie-indicator');
    const flash     = $('selfie-flash');

    for(let i = 0; i < 3; i++){
      // Countdown for this pose
      indicator.style.display = 'flex';
      indicator.innerHTML = `<div class="ind-shot">${i+1}<small>of 3</small></div><div class="ind-count">2</div>`;
      await sleep(700);
      indicator.querySelector('.ind-count').textContent = '1';
      await sleep(700);
      indicator.querySelector('.ind-count').textContent = '📸';
      await sleep(120);

      // Flash
      flash.style.transition = 'none';
      flash.style.opacity = '1';
      // Force reflow
      void flash.offsetHeight;
      flash.style.transition = 'opacity 280ms ease-out';
      flash.style.opacity = '0';

      // Capture this frame to a buffer canvas
      const buf = document.createElement('canvas');
      buf.width  = v.videoWidth;
      buf.height = v.videoHeight;
      const bctx = buf.getContext('2d');
      // Mirror so it matches what the user saw
      bctx.save();
      bctx.scale(-1, 1);
      bctx.drawImage(v, -buf.width, 0);
      bctx.restore();
      frames.push(buf);

      indicator.innerHTML = `<div class="ind-shot">✓ Got it!</div>`;
      await sleep(450);
    }

    indicator.style.display = 'none';

    // Compose strip
    composeStrip(frames);

    closeStream();
    isCapturing = false;
    showPreviewMode();
  }

  /* --- Compose the 1080×1920 strip --- */
  function composeStrip(frames){
    const c = $('selfie-canvas');
    c.width = STRIP_W; c.height = STRIP_H;
    const ctx = c.getContext('2d');

    // Background — cream paper
    ctx.fillStyle = '#F7F0E6';
    ctx.fillRect(0, 0, STRIP_W, STRIP_H);

    // ─── HEADER (terracotta block) ──────────────────────────────────
    ctx.fillStyle = '#B5421A';
    ctx.fillRect(0, 0, STRIP_W, HEADER_H);

    // Subtle gold radial accent in header
    const hgrad = ctx.createRadialGradient(STRIP_W*0.85, HEADER_H*0.2, 20, STRIP_W*0.85, HEADER_H*0.2, 380);
    hgrad.addColorStop(0, 'rgba(196,132,26,0.40)');
    hgrad.addColorStop(1, 'rgba(196,132,26,0)');
    ctx.fillStyle = hgrad;
    ctx.fillRect(0, 0, STRIP_W, HEADER_H);

    // Header text — left
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 60px "Hind", Cambria, Georgia, serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('GIDF 2026', 60, HEADER_H/2 - 20);
    ctx.font = `500 26px "Inter", system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.fillText('1–3 May · Shoonya, Ghent', 60, HEADER_H/2 + 28);

    // Score badge — right side of header
    const badgeR = 70;
    const bx = STRIP_W - badgeR - 70;
    const by = HEADER_H/2;
    // Outer glow
    ctx.fillStyle = 'rgba(255,253,248,0.20)';
    ctx.beginPath(); ctx.arc(bx, by, badgeR + 14, 0, Math.PI*2); ctx.fill();
    // Disc
    ctx.fillStyle = '#FFFDF8';
    ctx.beginPath(); ctx.arc(bx, by, badgeR, 0, Math.PI*2); ctx.fill();
    // Score number
    ctx.fillStyle = '#B5421A';
    ctx.font = `900 76px "Hind", serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(scoreData.score), bx, by - 8);
    ctx.font = `700 22px "Inter", sans-serif`;
    ctx.fillStyle = 'rgba(28,17,8,0.65)';
    ctx.fillText('/ ' + scoreData.total, bx, by + 38);

    // ─── 3 FRAMES ───────────────────────────────────────────────────
    let y = HEADER_H;
    frames.forEach((f, idx) => {
      // Center-crop the source frame to strip aspect (1080:480 = 2.25:1)
      const sw = f.width;
      const sh = f.height;
      const targetAspect = STRIP_W / FRAME_H;  // 2.25
      const sourceAspect = sw / sh;
      let crop_x, crop_y, crop_w, crop_h;
      if(sourceAspect > targetAspect){
        // Source is wider — crop sides
        crop_h = sh;
        crop_w = sh * targetAspect;
        crop_x = (sw - crop_w) / 2;
        crop_y = 0;
      } else {
        // Source is taller — crop top/bottom (centred on face area, slightly upper)
        crop_w = sw;
        crop_h = sw / targetAspect;
        crop_x = 0;
        crop_y = (sh - crop_h) * 0.30; // bias upward — face usually upper-middle
      }
      ctx.drawImage(f, crop_x, crop_y, crop_w, crop_h, 0, y, STRIP_W, FRAME_H);

      // Frame number badge (small, bottom-left of frame)
      ctx.fillStyle = 'rgba(13,8,40,0.72)';
      const tagW = 90, tagH = 36;
      const tagX = 28;
      const tagY = y + FRAME_H - tagH - 18;
      roundRect(ctx, tagX, tagY, tagW, tagH, 18);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `700 20px "Inter", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${idx+1} / 3`, tagX + tagW/2, tagY + tagH/2 + 1);

      y += FRAME_H;
      if(idx < 2){
        // Cream gap (already drawn from initial fill)
        y += GAP;
      }
    });

    // ─── FOOTER ─────────────────────────────────────────────────────
    const fy = HEADER_H + 3*FRAME_H + 2*GAP;
    ctx.fillStyle = '#0D0828';
    ctx.fillRect(0, fy, STRIP_W, FOOTER_H);

    // Headline
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.font = `700 22px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const headline = scoreData.isWinner
      ? 'PERFECT SCORE · WON A FREE DRINK'
      : 'TOOK THE GIDF 2026 QUIZ';
    ctx.fillText(headline, STRIP_W/2, fy + 70);

    // Big handle
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 50px "Inter", sans-serif`;
    ctx.fillText('@gentindiadansfestival', STRIP_W/2, fy + 130);

    // Sub
    ctx.fillStyle = 'rgba(255,255,255,0.50)';
    ctx.font = `500 22px "Inter", sans-serif`;
    ctx.fillText('gidf.abcdans.com · 1–3 May 2026', STRIP_W/2, fy + 178);

    // Save blob
    c.toBlob(b => { lastBlob = b; }, 'image/png', 0.92);
  }

  function roundRect(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y,   x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x,   y+h, r);
    ctx.arcTo(x,   y+h, x,   y,   r);
    ctx.arcTo(x,   y,   x+w, y,   r);
    ctx.closePath();
  }

  /* --- Stop / clean up --- */
  function closeStream(){
    if(stream){
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    const v = $('selfie-video');
    if(v) v.srcObject = null;
  }

  function exitToResult(){
    closeStream();
    isCapturing = false;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $('screen-result').classList.add('active');
  }

  function retake(){
    open(scoreData);
  }

  /* --- Share / Save --- */
  async function share(){
    if(!lastBlob){ save(); return; }
    const file = new File([lastBlob], 'gidf-2026-photo-strip.png', {type:'image/png'});
    const text = "Just took the GIDF Quiz at @gentindiadansfestival 🌶️ #GIDF2026 #IndianDance";
    if(navigator.canShare && navigator.canShare({files:[file]})){
      try{
        await navigator.share({files:[file], title:'GIDF 2026 photo strip', text});
      } catch(e){ if(e && e.name !== 'AbortError') save(); }
    } else {
      save();
      alert("Strip saved. Now: open Instagram → Stories → upload from camera roll → tag @gentindiadansfestival.");
    }
  }
  function save(){
    const c = $('selfie-canvas');
    if(!c) return;
    const link = document.createElement('a');
    link.download = 'gidf-2026-photo-strip.png';
    link.href = c.toDataURL('image/png');
    link.click();
  }

  /* --- Mode switching --- */
  function showShootMode(){
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $('screen-selfie').classList.add('active');
    $('selfie-shoot').style.display   = 'flex';
    $('selfie-preview').style.display = 'none';
  }
  function showPreviewMode(){
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $('screen-selfie').classList.add('active');
    $('selfie-shoot').style.display   = 'none';
    $('selfie-preview').style.display = 'flex';
  }

  // Stop the camera on tab hide / page unload
  window.addEventListener('pagehide', closeStream);

  window.GIDFSelfie = { open, capture: captureBurst, retake, share, save, exitToResult };
})();
