/* =========================================================================
   GIDF Quiz — Share card (canvas-based PNG for IG Stories)
   1080×1920 portrait card.
   - Web Share API for direct IG Stories on iOS/Android
   - Falls back to download for desktop
   ========================================================================= */
(function(){
  const W = 1080, H = 1920;
  let lastBlob = null;
  let lastKey  = null;  // memoize render across identical inputs

  function render({name, ig, score, total, isWinner}){
    const key = JSON.stringify({name, ig, score, total, isWinner});
    if(key === lastKey) return; // skip identical redraws
    lastKey = key;
    const canvas = document.getElementById('share-canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Background gradient — two-stop, on-brand (nav-dark → accent)
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0D0828');  // --nav-dark
    grad.addColorStop(1, '#B5421A');  // --accent
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,W,H);

    // Soft glow blobs
    radialBlob(ctx,  900,  300, 600, 'rgba(196,132,26,0.32)'); // gold
    radialBlob(ctx,  150, 1700, 500, 'rgba(181,66,26,0.42)');  // accent

    // Top brand
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '700 44px "Hind", serif';
    ctx.textAlign = 'left';
    ctx.fillText('GIDF 2026 · Gent India Dans Festival', 80, 140);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '500 32px "Inter", sans-serif';
    ctx.fillText('1–3 May · Shoonya Dance Centre, Ghent', 80, 190);

    // Vertical divider line
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(80, 230); ctx.lineTo(W-80, 230); ctx.stroke();

    // Hero label
    ctx.fillStyle = '#C4841A';
    ctx.font = '800 36px "Inter", sans-serif';
    ctx.fillText(isWinner ? 'I WON A FREE DRINK' : 'I TOOK THE GIDF QUIZ', 80, 320);

    // Score — giant
    ctx.fillStyle = '#fff';
    ctx.font = '900 360px "Hind", serif';
    ctx.textAlign = 'left';
    ctx.fillText(String(score), 80, 720);

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '700 200px "Hind", serif';
    const scoreW = ctx.measureText(String(score)).width;
    ctx.fillText('/'+total, 80 + scoreOffset(score), 720);

    // Score label
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '700 44px "Hind", serif';
    ctx.fillText(scoreSubtitle(score, total, isWinner), 80, 820);

    // Middle quote / description
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = '500 38px "Inter", sans-serif';
    wrapText(ctx, scoreFlavor(score, total, isWinner), 80, 980, W-160, 56);

    // Player line
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '600 30px "Inter", sans-serif';
    ctx.fillText('— ' + (name || 'Anon') + ' (@' + ((ig||'').replace(/^@/,'')) + ')', 80, 1240);

    // Big bottom card
    roundRect(ctx, 80, 1340, W-160, 380, 36);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = '800 60px "Hind", serif';
    ctx.fillText('Try the quiz.', 130, 1450);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '500 36px "Inter", sans-serif';
    wrapText(ctx, 'Scan a QR around Shoonya. 10 questions · 10 seconds each. Perfect score = free drink.', 130, 1520, W-260, 50);

    // Footer tag
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = '700 36px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('@gentindiadansfestival', W/2, 1820);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '500 28px "Inter", sans-serif';
    ctx.fillText('gidf.abcdans.com', W/2, 1870);

    // Save blob for sharing
    canvas.toBlob(b => { lastBlob = b; }, 'image/png');
  }

  function scoreOffset(score){
    const s = String(score);
    return s.length === 2 ? 480 : 280;
  }

  function scoreSubtitle(score, total, isWinner){
    if(isWinner) return 'PERFECT SCORE · ' + total + '/' + total;
    if(score >= 7) return 'NEARLY PERFECT';
    if(score >= 4) return 'NOT BAD';
    return 'CAME FOR THE DANCE, NOT THE QUIZ';
  }

  function scoreFlavor(score, total, isWinner){
    if(isWinner) return '"I crushed the GIDF trivia and won a drink at the bar. Catch me at Spill the Chai."';
    if(score >= 7) return 'Came so close to a perfect run. The dance taught me more than I taught it.';
    if(score >= 4) return 'Learned a thing or two about Indian dance and Bollywood today.';
    return 'I am here for the workshops, not the trivia. Glory awaits on the dance floor.';
  }

  // ---------- canvas helpers ----------
  function radialBlob(ctx, x, y, r, color){
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
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
  function wrapText(ctx, text, x, y, maxW, lineH){
    const words = text.split(' ');
    let line = '';
    let cy = y;
    for(let n=0;n<words.length;n++){
      const test = line + words[n] + ' ';
      const w = ctx.measureText(test).width;
      if(w > maxW && n > 0){
        ctx.fillText(line, x, cy);
        line = words[n] + ' ';
        cy += lineH;
      } else {
        line = test;
      }
    }
    ctx.fillText(line, x, cy);
  }

  // ---------- share / save ----------
  async function share(){
    const canvas = document.getElementById('share-canvas');
    canvas.toBlob(async (blob) => {
      if(!blob) return;
      const file = new File([blob], 'gidf-2026-quiz-score.png', {type:'image/png'});
      const text = "Just took the GIDF Quiz at @gentindiadansfestival 🌶️ #GIDF2026 #IndianDance";

      if(navigator.canShare && navigator.canShare({files:[file]})){
        try{
          await navigator.share({
            files:[file],
            title:'GIDF 2026 Quiz',
            text
          });
        } catch(e){
          // User cancelled or share failed → fall through to download
          if(e && e.name !== 'AbortError') save();
        }
      } else {
        // Desktop / older mobile fallback
        save();
        alert("Image saved. Now: open Instagram → Stories → upload from camera roll → tag @gentindiadansfestival.");
      }
    }, 'image/png');
  }

  function save(){
    const canvas = document.getElementById('share-canvas');
    const link = document.createElement('a');
    link.download = 'gidf-2026-quiz-score.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  window.GIDFShare = { render, share, save };
})();
