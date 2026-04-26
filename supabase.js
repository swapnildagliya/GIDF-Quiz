/* =========================================================================
   GIDF Quiz — Supabase client + voucher claim
   ---------------------------------------------------------------------------
   Atomic logic happens server-side via a Postgres function: try_claim_voucher.
   See SETUP.md for the SQL schema (vouchers table + RPC + RLS).

   How to configure:
     1. Create a free Supabase project (sign in with GitHub).
     2. Run the SQL in SETUP.md to create the vouchers table + RPC.
     3. Paste your project URL + anon key into the CONFIG block below.
     4. Commit & push. Done.

   If config is left empty (or the request fails), the app falls back to a
   "cannot reach scoreboard" message — winner still sees they got 10/10,
   they just have to flag staff at the bar manually.
   ========================================================================= */
(function(){
  // ---------- CONFIG ----------
  const CONFIG = {
    SUPABASE_URL:  '',  // e.g. 'https://abcd1234.supabase.co'
    SUPABASE_ANON: '',  // anon/public key — safe to publish
    MAX_VOUCHERS:  10
  };
  // ----------------------------

  let client = null;
  function getClient(){
    if(client) return client;
    if(!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON) return null;
    if(typeof supabase === 'undefined') return null;
    client = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON, {
      auth: { persistSession: false }
    });
    return client;
  }

  /**
   * Atomically attempt to claim a voucher.
   * Returns:
   *   { ok:true, code:'XXXXXX' }                — fresh win
   *   { alreadyClaimed:true, code:'XXXXXX' }    — same IG already has one
   *   { ok:false, soldOut:true }                — 10 already issued
   *   throws on network/config error
   */
  async function claimVoucher({name, ig, deviceId, score}){
    const c = getClient();
    if(!c) throw new Error('Supabase not configured');
    const igNorm = (ig || '').toLowerCase().replace(/^@/,'').trim();
    const { data, error } = await c.rpc('try_claim_voucher', {
      p_name: name,
      p_ig: igNorm,
      p_device: deviceId,
      p_score: score,
      p_max: CONFIG.MAX_VOUCHERS
    });
    if(error) throw error;
    // RPC returns: { status: 'issued'|'duplicate'|'sold_out', code: '...' }
    if(data && data.status === 'issued') return { ok:true, code: data.code };
    if(data && data.status === 'duplicate') return { alreadyClaimed:true, code: data.code };
    if(data && data.status === 'sold_out') return { ok:false, soldOut:true };
    throw new Error('Unexpected RPC response: '+JSON.stringify(data));
  }

  /**
   * Bar-staff side: redeem a code (mark as used).
   * Used by bar.html after PIN check.
   */
  async function redeemVoucher(code){
    const c = getClient();
    if(!c) throw new Error('Supabase not configured');
    const { data, error } = await c.rpc('redeem_voucher', {
      p_code: (code || '').toUpperCase().trim()
    });
    if(error) throw error;
    return data; // { status:'ok'|'already_redeemed'|'not_found', name, ig, redeemedAt }
  }

  /**
   * Read remaining voucher count (for landing screen / bar dashboard).
   */
  async function remainingVouchers(){
    const c = getClient();
    if(!c) return null;
    const { count } = await c.from('vouchers').select('*', {count:'exact', head:true});
    if(count == null) return null;
    return Math.max(0, CONFIG.MAX_VOUCHERS - count);
  }

  window.GIDFSupabase = { claimVoucher, redeemVoucher, remainingVouchers, _config: CONFIG };
})();
