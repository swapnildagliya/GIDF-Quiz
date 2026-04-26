/* =========================================================================
   GIDF Quiz — Selfie with score overlay
   ---------------------------------------------------------------------------
   Live front camera + brand watermark (score + @handle) → capture → share.
   Uses MediaDevices.getUserMedia (requires HTTPS + camera permission).
   Falls back gracefully if denied/unsupported.
   ========================================================================= */
(function(){
  let stream = null;
  let scoreData = null;       // {name, ig, score, total, isWinner}
  let lastBlob = null;

  function $(id){ return document.getElementById(id); }

  /* --- Open: request camera + show the shoot screen --- */
  async function open(data){
    scoreData = data;
    // Update live overlay text
    $('overlay-score-num').textContent = data.score;
    $('overlay-score-total').textContent = '/' + data.total;
    $('overlay-handle').textContent = '@gentindiadansfestival';
    $('overlay-headline').textContent = data.isWinner
      ? 'Won a free drink at GIDF 2026'
      : 'Took the GIDF 2026 Quiz';

    // Pre-flight checks
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
        ? "Camera access blocked. To enable it: Safari → AA icon in URL bar → Website Settings → Camera → Allow. Then try again."
        : "Couldn't start the camera. Try closing other camera apps and reopening this page.";
      alert(msg);
    }
  }

  /* --- Capture: draw video + overlay to canvas, stop camera, preview --- */
  function capture(){
    const v = $('selfie-video');
    const c = $('selfie-canvas');
    if(!v || !c || !stream) return;
    const w = v.videoWidth, h = v.videoHeight;
    if(!w || !h){ alert('Camera not ready yet — give it a sec.'); return; }
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');

    // Draw video frame mirrored — front cam looks natural to the user this way
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(v, -w, 0, w, h);
    ctx.restore();

    // Composite the watermark on top
    drawOverlay(ctx, w, h, scoreData);

    // Save blob for share
    c.toBlob(b => { lastBlob = b; }, 'image/png', 0.92);

    closeStream();
    showPreviewMode();
  }

  /* --- Watermark: drawn proportionally so it works at any video resolution --- */
  function drawOverlay(ctx, w, h, d){
    const isWin = !!d.isWinner;

    // ─── Top dark gradient strip ──────────────────────────────────────
    const topH = h * 0.13;
    const tg = ctx.createLinearGradient(0, 0, 0, topH);
    tg.addColorStop(0, 'rgba(13,8,40,0.78)');
    tg.addColorStop(1, 'rgba(13,8,40,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(0, 0, w, topH);

    // Brand line top-left
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${Math.round(h * 0.024)}px "Hind", Cambria, Georgia, serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('GIDF 2026 · 1–3 May · Shoonya', w * 0.045, h * 0.055);
    // Sub-line
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = `500 ${Math.round(h * 0.016)}px "Inter", system-ui, sans-serif`;
    ctx.fillText(isWin ? 'Won a free drink at the bar 🥂' : 'Took the GIDF 2026 Quiz', w * 0.045, h * 0.085);

    // ─── Score badge top-right ────────────────────────────────────────
    const badgeR = h * 0.055;
    const bx = w - badgeR - w * 0.045;
    const by = h * 0.072;
    // Outer glow ring
    ctx.fillStyle = 'rgba(196,132,26,0.32)';
    ctx.beginPath(); ctx.arc(bx, by, badgeR * 1.32, 0, Math.PI * 2); ctx.fill();
    // Solid disc
    ctx.fillStyle = '#B5421A'; // --accent
    ctx.beginPath(); ctx.arc(bx, by, badgeR, 0, Math.PI * 2); ctx.fill();
    // Inner ring
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth  = badgeR * 0.05;
    ctx.beginPath(); ctx.arc(bx, by, badgeR * 0.86, 0, Math.PI * 2); ctx.stroke();
    // Score number
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${Math.round(badgeR * 0.95)}px "Hind", Cambria, Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(d.score), bx, by - badgeR * 0.07);
    // /10 sub
    ctx.font = `700 ${Math.round(badgeR * 0.32)}px "Inter", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.fillText('/' + d.total, bx, by + badgeR * 0.42);

    // ─── Bottom dark strip ────────────────────────────────────────────
    const botH = h * 0.16;
    const bg = ctx.createLinearGradient(0, h - botH, 0, h);
    bg.addColorStop(0, 'rgba(0,0,0,0)');
    bg.addColorStop(1, 'rgba(0,0,0,0.78)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, h - botH, w, botH);

    // Headline (small caps)
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = `700 ${Math.round(h * 0.018)}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const headline = isWin ? 'PERFECT SCORE · 10/10 · WINNER' : `SCORE: ${d.score}/${d.total} · GIDF 2026 QUIZ`;
    ctx.fillText(headline.toUpperCase(), w/2, h - h * 0.085);
    // IG handle big
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 ${Math.round(h * 0.030)}px "Inter", sans-serif`;
    ctx.fillText('@gentindiadansfestival', w/2, h - h * 0.04);
  }

  /* --- Stop camera tracks --- */
  function closeStream(){
    if(stream){
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    const v = $('selfie-video');
    if(v) v.srcObject = null;
  }

  /* --- Cancel / Done: stop camera, return to result screen --- */
  function exitToResult(){
    closeStream();
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $('screen-result').classList.add('active');
  }

  function retake(){
    open(scoreData);
  }

  /* --- Share / Save --- */
  async function share(){
    if(!lastBlob){ save(); return; }
    const file = new File([lastBlob], 'gidf-2026-selfie.png', {type:'image/png'});
    const text = "Just took the GIDF Quiz at @gentindiadansfestival 🌶️ #GIDF2026 #IndianDance";
    if(navigator.canShare && navigator.canShare({files:[file]})){
      try{
        await navigator.share({files:[file], title:'GIDF 2026', text});
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
    link.download = 'gidf-2026-selfie.png';
    link.href = c.toDataURL('image/png');
    link.click();
  }

  /* --- Mode switching within the selfie screen --- */
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

  // Stop the camera if the user navigates away mid-shoot
  window.addEventListener('pagehide', closeStream);

  window.GIDFSelfie = { open, capture, retake, share, save, exitToResult };
})();
