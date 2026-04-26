/* =========================================================================
   GIDF Quiz — Standee Challenge Selfie
   ---------------------------------------------------------------------------
   60-second challenge: find the GIDF standee, strike a dance pose, snap.
   Single hero shot (1080×1920) with floating brand stickers + score badge
   + a "STANDEE CHAMPION · X seconds" gold pill if they made the timer.
   Uses MediaDevices.getUserMedia (HTTPS + camera permission required).
   ========================================================================= */
(function(){
  const CHALLENGE_SECONDS = 60;

  let stream     = null;
  let scoreData  = null;     // {name, ig, score, total, isWinner}
  let lastBlob   = null;
  let isCapturing = false;

  // Challenge timing
  let challengeStartMs    = 0;
  let challengeDeadlineMs = 0;
  let challengeRaf        = 0;
  let captureElapsedMs    = null;  // null until they actually snap

  function $(id){ return document.getElementById(id); }

  /* ─── ENTRY: show intro briefing ─────────────────────────────────── */
  function open(data){
    scoreData       = data;
    isCapturing     = false;
    captureElapsedMs = null;

    // Update brand overlay text (used during shoot)
    $('overlay-score-num').textContent   = data.score;
    $('overlay-score-total').textContent = '/' + data.total;
    $('overlay-handle').textContent      = '@gentindiadansfestival';
    $('overlay-headline').textContent    = data.isWinner
      ? 'Won a free drink at GIDF 2026'
      : 'Took the GIDF 2026 Quiz';

    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      alert("Your browser doesn't support camera access. Try Safari or Chrome on your phone.");
      return;
    }
    showIntroMode();
  }

  /* ─── On Go: request camera + start the 60s clock ────────────────── */
  async function startChallenge(){
    try{
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:'user', width:{ideal:1080}, height:{ideal:1920} },
        audio: false
      });
      const v = $('selfie-video');
      v.srcObject = stream;
      v.setAttribute('playsinline','');
      v.muted = true;
      await v.play();

      challengeStartMs    = Date.now();
      challengeDeadlineMs = challengeStartMs + CHALLENGE_SECONDS * 1000;
      tickChallenge();

      showShootMode();

    } catch(e){
      console.error('Camera failed:', e);
      const msg = (e && e.name === 'NotAllowedError')
        ? "Camera access blocked. Safari → AA icon in URL bar → Website Settings → Camera → Allow. Then try again."
        : "Couldn't start the camera. Close other camera apps and reopen this page.";
      alert(msg);
      showIntroMode();
    }
  }

  function tickChallenge(){
    const now = Date.now();
    const remaining = Math.max(0, challengeDeadlineMs - now);
    const sec = Math.ceil(remaining / 1000);
    const t = $('challenge-timer');
    if(t){
      if(remaining <= 0){
        t.textContent = '⏰ TIME UP — still snap!';
      } else {
        const mm = Math.floor(sec / 60).toString().padStart(2,'0');
        const ss = (sec % 60).toString().padStart(2,'0');
        t.textContent = `${mm}:${ss}`;
      }
      t.classList.toggle('warn',   sec <= 15 && sec > 5);
      t.classList.toggle('danger', sec <= 5);
      t.classList.toggle('expired', remaining <= 0);
    }
    if(remaining > 0){
      challengeRaf = requestAnimationFrame(tickChallenge);
    }
  }
  function stopChallengeTimer(){
    if(challengeRaf) cancelAnimationFrame(challengeRaf);
    challengeRaf = 0;
  }

  /* ─── Capture: single hero shot + composite watermark ────────────── */
  function capture(){
    const v = $('selfie-video');
    const c = $('selfie-canvas');
    if(!v || !c || !stream || !v.videoWidth){ alert('Camera not ready — give it a sec.'); return; }
    if(isCapturing) return;
    isCapturing = true;

    captureElapsedMs = Date.now() - challengeStartMs;
    stopChallengeTimer();

    // Flash
    const flash = $('selfie-flash');
    if(flash){
      flash.style.transition = 'none';
      flash.style.opacity = '1';
      void flash.offsetHeight;
      flash.style.transition = 'opacity 320ms ease-out';
      flash.style.opacity = '0';
    }

    const w = v.videoWidth, h = v.videoHeight;
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    // Mirror so it matches the live preview the user saw
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(v, -w, 0);
    ctx.restore();

    drawHeroOverlay(ctx, w, h, scoreData, captureElapsedMs);

    c.toBlob(b => { lastBlob = b; }, 'image/png', 0.92);

    closeStream();
    isCapturing = false;
    showPreviewMode();
  }

  /* ─── Watermark: floating IG-Stories-style stickers on top of the photo ─── */
  function drawHeroOverlay(ctx, w, h, d, elapsedMs){
    const isWin = !!d.isWinner;
    const elapsedSec = Math.round(elapsedMs / 1000);
    const madeTime = elapsedSec <= CHALLENGE_SECONDS;

    // ── Top dark gradient strip ──────────────────────────────────────
    const topH = h * 0.16;
    const tg = ctx.createLinearGradient(0, 0, 0, topH);
    tg.addColorStop(0, 'rgba(13,8,40,0.80)');
    tg.addColorStop(1, 'rgba(13,8,40,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(0, 0, w, topH);

    // Brand line top-left
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${Math.round(h * 0.026)}px "Hind", Cambria, Georgia, serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('GIDF 2026 · 1–3 May · Shoonya', w * 0.045, h * 0.045);

    // Challenge result pill (top-left, second line)
    if(madeTime){
      // Gold "champion" pill
      const pillTxt = `STANDEE CHAMPION · ${elapsedSec}s`;
      ctx.font = `900 ${Math.round(h * 0.020)}px "Inter", system-ui, sans-serif`;
      const pillW = ctx.measureText(pillTxt).width + Math.round(h * 0.03);
      const pillH = Math.round(h * 0.034);
      const pillX = w * 0.045;
      const pillY = h * 0.075;
      roundRect(ctx, pillX, pillY, pillW, pillH, pillH/2);
      ctx.fillStyle = '#C4841A'; // gold
      ctx.fill();
      ctx.fillStyle = '#0D0828';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(pillTxt, pillX + Math.round(h * 0.015), pillY + pillH/2 + 1);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.font = `600 ${Math.round(h * 0.019)}px "Inter", sans-serif`;
      ctx.fillText('STANDEE CHALLENGE · attempted', w * 0.045, h * 0.085);
    }

    // ── Score badge — top-right circular sticker ─────────────────────
    const badgeR = h * 0.07;
    const bx = w - badgeR - w * 0.045;
    const by = h * 0.085;
    // Outer glow
    ctx.fillStyle = 'rgba(196,132,26,0.36)';
    ctx.beginPath(); ctx.arc(bx, by, badgeR * 1.34, 0, Math.PI*2); ctx.fill();
    // Solid disc — terracotta
    ctx.fillStyle = '#B5421A';
    ctx.beginPath(); ctx.arc(bx, by, badgeR, 0, Math.PI*2); ctx.fill();
    // Inner thin white ring
    ctx.strokeStyle = 'rgba(255,255,255,0.42)';
    ctx.lineWidth  = badgeR * 0.05;
    ctx.beginPath(); ctx.arc(bx, by, badgeR * 0.86, 0, Math.PI*2); ctx.stroke();
    // Score number
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${Math.round(badgeR * 0.95)}px "Hind", Cambria, Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(d.score), bx, by - badgeR * 0.07);
    ctx.font = `700 ${Math.round(badgeR * 0.32)}px "Inter", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.80)';
    ctx.fillText('/' + d.total, bx, by + badgeR * 0.44);

    // ── Bottom dark strip ────────────────────────────────────────────
    const botH = h * 0.18;
    const bg = ctx.createLinearGradient(0, h - botH, 0, h);
    bg.addColorStop(0, 'rgba(0,0,0,0)');
    bg.addColorStop(1, 'rgba(0,0,0,0.82)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, h - botH, w, botH);

    // Headline (small caps)
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = `700 ${Math.round(h * 0.020)}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const headline = isWin
      ? 'PERFECT SCORE · WON A FREE DRINK'
      : `SCORE ${d.score}/${d.total} · GIDF 2026 QUIZ`;
    ctx.fillText(headline, w/2, h - h * 0.085);

    // Big handle
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${Math.round(h * 0.034)}px "Inter", sans-serif`;
    ctx.fillText('@gentindiadansfestival', w/2, h - h * 0.04);
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

  /* ─── Cleanup / mode switch ──────────────────────────────────────── */
  function closeStream(){
    if(stream){
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    const v = $('selfie-video');
    if(v) v.srcObject = null;
    stopChallengeTimer();
  }

  function exitToResult(){
    closeStream();
    isCapturing = false;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $('screen-result').classList.add('active');
  }

  function retake(){
    closeStream();
    open(scoreData); // back to intro briefing → fresh 60s timer
  }

  function showIntroMode(){
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $('screen-selfie').classList.add('active');
    $('selfie-intro').style.display   = 'flex';
    $('selfie-shoot').style.display   = 'none';
    $('selfie-preview').style.display = 'none';
  }
  function showShootMode(){
    $('selfie-intro').style.display   = 'none';
    $('selfie-shoot').style.display   = 'flex';
    $('selfie-preview').style.display = 'none';
  }
  function showPreviewMode(){
    $('selfie-intro').style.display   = 'none';
    $('selfie-shoot').style.display   = 'none';
    $('selfie-preview').style.display = 'flex';
  }

  /* ─── Share / Save ───────────────────────────────────────────────── */
  async function share(){
    if(!lastBlob){ save(); return; }
    const file = new File([lastBlob], 'gidf-2026-standee.png', {type:'image/png'});
    const text = "I took the standee challenge at GIDF 2026 🌶️ @gentindiadansfestival #GIDF2026";
    if(navigator.canShare && navigator.canShare({files:[file]})){
      try{
        await navigator.share({files:[file], title:'GIDF 2026 — Standee Challenge', text});
      } catch(e){ if(e && e.name !== 'AbortError') save(); }
    } else {
      save();
      alert("Image saved. Now: open Instagram → Stories → upload from camera roll → tag @gentindiadansfestival.");
    }
  }
  function save(){
    const c = $('selfie-canvas');
    if(!c) return;
    const link = document.createElement('a');
    link.download = 'gidf-2026-standee.png';
    link.href = c.toDataURL('image/png');
    link.click();
  }

  // Stop camera if user navigates away
  window.addEventListener('pagehide', closeStream);

  window.GIDFSelfie = { open, startChallenge, capture, retake, share, save, exitToResult };
})();
