/* =========================================================================
   GIDF Quiz — Share card (canvas-based PNG for IG Stories)
   1080×1920 portrait card · Shoonya Design System v1.
   - Solid terracotta foundation (the vibrant treated as a color block)
   - Playfair Display Medium for headlines · Inter Regular for body
   - No bold weights (Medium 500 is the max per design system)
   - Web Share API for direct IG Stories on iOS/Android
   ========================================================================= */
(function(){
  const W = 1080, H = 1920;
  const SERIF = '"Playfair Display", Cambria, Georgia, serif';
  const SANS  = '"Inter", system-ui, sans-serif';
  const TERRA = '#B5421A';
  let lastBlob = null;
  let lastKey  = null;  // memoize render across identical inputs

  function render({name, ig, score, total, isWinner}){
    const key = JSON.stringify({name, ig, score, total, isWinner});
    if(key === lastKey) return;
    lastKey = key;
    const canvas = document.getElementById('share-canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Solid terracotta foundation — the vibrant as a colour block per §03
    ctx.fillStyle = TERRA;
    ctx.fillRect(0,0,W,H);

    // Top brand
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = `500 44px ${SERIF}`;
    ctx.textAlign = 'left';
    ctx.fillText('GIDF 2026 · Gent India Dans Festival', 80, 140);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `400 30px ${SANS}`;
    ctx.fillText('1–3 May · Shoonya Dance Centre, Ghent', 80, 188);

    // Hairline divider
    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(80, 230); ctx.lineTo(W-80, 230); ctx.stroke();

    // Hero label — caps eyebrow
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.font = `500 32px ${SANS}`;
    ctx.fillText(isWinner ? 'I WON A FREE DRINK' : 'I TOOK THE GIDF QUIZ', 80, 320);

    // Giant score number — Playfair Medium
    ctx.fillStyle = '#fff';
    ctx.font = `500 360px ${SERIF}`;
    ctx.textAlign = 'left';
    ctx.fillText(String(score), 80, 720);

    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `400 200px ${SERIF}`;
    ctx.fillText('/'+total, 80 + scoreOffset(score), 720);

    // Score subtitle in italic Playfair
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `italic 400 44px ${SERIF}`;
    ctx.fillText(scoreSubtitle(score, total, isWinner), 80, 820);

    // Middle quote / description
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `italic 400 38px ${SERIF}`;
    wrapText(ctx, scoreFlavor(score, total, isWinner), 80, 980, W-160, 56);

    // Player line — small
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = `400 30px ${SANS}`;
    ctx.fillText('— ' + (name || 'Anon') + ' (@' + ((ig||'').replace(/^@/,'')) + ')', 80, 1240);

    // Bottom card — outlined, no fill
    roundRect(ctx, 80, 1340, W-160, 380, 28);
    ctx.strokeStyle = 'rgba(255,255,255,0.30)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = `500 60px ${SERIF}`;
    ctx.fillText('Try the quiz.', 130, 1450);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = `400 32px ${SANS}`;
    wrapText(ctx, 'Scan a QR around Shoonya. 10 questions · 10 seconds each. Perfect score = free drink.', 130, 1520, W-260, 46);

    // Footer tag
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = `500 36px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText('@gentindiadansfestival', W/2, 1820);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `400 26px ${SANS}`;
    ctx.fillText('gidf.abcdans.com', W/2, 1870);

    canvas.toBlob(b => { lastBlob = b; }, 'image/png');
  }

  function scoreOffset(score){
    const s = String(score);
    return s.length === 2 ? 480 : 280;
  }

  function scoreSubtitle(score, total, isWinner){
    if(isWinner) return 'Perfect score · ' + total + '/' + total;
    if(score >= 7) return 'Nearly perfect';
    if(score >= 4) return 'Not bad';
    return 'Came for the dance, not the quiz';
  }

  function scoreFlavor(score, total, isWinner){
    if(isWinner) return '"I crushed the GIDF trivia and won a drink at the bar. Catch me at Spill the Chai."';
    if(score >= 7) return 'Came so close to a perfect run. The dance taught me more than I taught it.';
    if(score >= 4) return 'Learned a thing or two about Indian dance and Bollywood today.';
    return 'I am here for the workshops, not the trivia. Glory awaits on the dance floor.';
  }

  // ---------- canvas helpers ----------
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
          await navigator.share({ files:[file], title:'GIDF 2026 Quiz', text });
        } catch(e){
          if(e && e.name !== 'AbortError') save();
        }
      } else {
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
