/* InvestingNoobs — accounts, synced watchlist and price alerts.
   Nothing here runs until the visitor opens the Alerts panel, so the page
   stays exactly as fast as it was for everyone who never uses it. */
(function () {
  'use strict';

  var SUPA_URL = 'https://yreinzemfharuuvumduq.supabase.co';
  var SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZWluemVtZmhhcnV1dnVtZHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNTY3OTEsImV4cCI6MjEwNTgzMjc5MX0.UP3hxRhd1nB90vmUKdLBrR8wRMSn2095M2sd80jxkZw';
  var VAPID = 'BGx0-Q9Xy7n6EXoZWS40ahUrWwBxiJICX931mcupbUsVRIRoGVZy9VRJ2WbBsKpbt2zJXu5DyKQMxpo3z1uyyko';
  var SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';

  var sb = null;         // supabase client, created on first use
  var user = null;
  var alerts = [];
  var mergedOnce = false;

  /* ---------------- helpers ---------------- */

  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function money(n) {
    n = Number(n);
    if (!isFinite(n)) return '—';
    if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (n >= 1) return n.toFixed(2);
    return n.toPrecision(4);
  }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = res; s.onerror = function () { rej(new Error('script')); };
      document.head.appendChild(s);
    });
  }
  function urlB64ToUint8(base64) {
    var padding = '='.repeat((4 - base64.length % 4) % 4);
    var b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(b64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function toast(msg) {
    var t = document.getElementById('in-toast');
    if (!t) {
      t = el('div', { id: 'in-toast' });
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove('is-on'); }, 3200);
  }

  /* ---------------- styles ---------------- */

  function css() {
    if (document.getElementById('in-alerts-css')) return;
    var s = el('style', { id: 'in-alerts-css' });
    s.textContent = [
      '#in-modal{position:fixed;inset:0;z-index:9999;display:none;align-items:flex-end;justify-content:center;',
      'background:rgba(4,7,11,.72);backdrop-filter:blur(3px);}',
      '#in-modal.is-on{display:flex;}',
      '#in-panel{width:100%;max-width:520px;max-height:88vh;overflow:auto;background:#0f141b;border:1px solid #242b35;',
      'border-radius:16px 16px 0 0;padding:20px;color:#eceef1;font-family:system-ui,-apple-system,sans-serif;}',
      '@media(min-width:620px){#in-modal{align-items:center;}#in-panel{border-radius:16px;}}',
      '#in-panel h2{margin:0;font-size:19px;font-family:Fraunces,Georgia,serif;font-weight:600;}',
      '.in-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px;}',
      '.in-x{background:none;border:0;color:#8b93a0;font-size:26px;line-height:1;cursor:pointer;padding:0 4px;}',
      '.in-sub{color:#8b93a0;font-size:13px;line-height:1.5;margin:0 0 16px;}',
      '.in-field{display:block;margin-bottom:12px;font-size:12px;color:#8b93a0;}',
      '.in-field input,.in-field select{width:100%;margin-top:5px;padding:11px 12px;border-radius:9px;background:#151b24;',
      'border:1px solid #242b35;color:#eceef1;font-size:15px;font-family:inherit;}',
      '.in-field input:focus,.in-field select:focus{outline:none;border-color:#c9a35a;}',
      '.in-row{display:flex;gap:10px;}.in-row>*{flex:1;}',
      '.in-wide{width:100%;justify-content:center;text-align:center;}',
      '.in-ghost{background:none;border:1px solid #242b35;color:#eceef1;padding:9px 14px;border-radius:9px;',
      'cursor:pointer;font-size:13px;font-family:inherit;}',
      '.in-ghost:hover{border-color:#c9a35a;}',
      '.in-alert{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 0;',
      'border-bottom:1px solid #1c232e;font-size:14px;}',
      '.in-alert small{display:block;color:#8b93a0;font-size:11.5px;margin-top:2px;}',
      '.in-del{background:none;border:0;color:#8b93a0;cursor:pointer;font-size:16px;padding:4px;}',
      '.in-del:hover{color:#ff8f8f;}',
      '.in-err{color:#ff9b9b;font-size:13px;margin:0 0 12px;}',
      '.in-ok{color:#7fd6a5;font-size:13px;margin:0 0 12px;}',
      '.in-sep{height:1px;background:#1c232e;margin:18px 0;}',
      '#in-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(20px);z-index:10000;',
      'background:#151b24;border:1px solid #2c3746;color:#eceef1;padding:11px 18px;border-radius:10px;font-size:14px;',
      'opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;max-width:90vw;text-align:center;}',
      '#in-toast.is-on{opacity:1;transform:translateX(-50%) translateY(0);}'
    ].join('');
    document.head.appendChild(s);
  }

  /* ---------------- supabase ---------------- */

  async function client() {
    if (sb) return sb;
    if (!window.supabase) await loadScript(SDK);
    sb = window.supabase.createClient(SUPA_URL, SUPA_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'in-auth' }
    });
    var got = await sb.auth.getUser();
    user = (got && got.data && got.data.user) || null;
    sb.auth.onAuthStateChange(function (_e, session) {
      user = session ? session.user : null;
    });
    return sb;
  }

  /* ---------------- watchlist sync ---------------- */

  function localList() {
    try { return JSON.parse(localStorage.getItem('ct_watchlist') || '[]'); } catch (_) { return []; }
  }

  async function pullWatchlist() {
    if (!user) return;
    var r = await sb.from('watchlists').select('items').eq('user_id', user.id).maybeSingle();
    var cloud = (r.data && Array.isArray(r.data.items)) ? r.data.items : [];
    var mine = localList();
    // The very first time this device links an account we keep both lists.
    // After that the cloud copy wins, so removing an item on one device
    // actually removes it everywhere instead of coming back on the next sync.
    var first = false;
    try { first = localStorage.getItem('in_merged_' + user.id) !== '1'; } catch (_) { first = !mergedOnce; }
    var merged = first ? [...new Set(cloud.concat(mine))] : cloud;
    mergedOnce = true;
    try { localStorage.setItem('in_merged_' + user.id, '1'); } catch (_) {}
    if (typeof window.IN_SET_WATCHLIST === 'function') window.IN_SET_WATCHLIST(merged);
    if (merged.length !== cloud.length) await pushWatchlist(merged);
  }

  async function pushWatchlist(list) {
    if (!user || !sb) return;
    await sb.from('watchlists').upsert({
      user_id: user.id,
      items: list || localList(),
      updated_at: new Date().toISOString()
    });
  }

  var pushTimer = null;
  window.addEventListener('in-watchlist-changed', function () {
    if (!user || !sb) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { pushWatchlist(); }, 800);
  });

  /* ---------------- notifications ---------------- */

  function pushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window;
  }
  function standalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  async function enablePush() {
    if (!pushSupported()) throw new Error('This browser cannot show notifications.');
    var perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error('Notifications are blocked in your browser settings.');
    var reg = await navigator.serviceWorker.ready;
    var sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8(VAPID)
      });
    }
    var j = sub.toJSON();
    await sb.from('push_subs').upsert({
      endpoint: j.endpoint,
      user_id: user.id,
      p256dh: j.keys.p256dh,
      auth: j.keys.auth
    });
    try { localStorage.setItem('in_push', '1'); } catch (_) {}
  }

  async function pushState() {
    if (!pushSupported()) return 'unsupported';
    if (Notification.permission !== 'granted') return 'off';
    try {
      var reg = await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.getSubscription();
      return sub ? 'on' : 'off';
    } catch (_) { return 'off'; }
  }

  /* ---------------- asset list ---------------- */

  function assets() {
    var m = window.IN_MARKET || {};
    var out = [];
    (m.crypto || []).slice(0, 120).forEach(function (c) {
      out.push({ kind: 'crypto', source_id: c.id, label: (c.symbol || '').toUpperCase(), name: c.name, price: c.current_price });
    });
    (m.commodities || []).forEach(function (c) {
      out.push({ kind: 'metal', source_id: c.symbol || c.id, label: c.name, name: c.name, price: c.current_price });
    });
    (m.stocks || []).forEach(function (c) {
      out.push({ kind: 'stock', source_id: c.symbol, label: c.symbol, name: c.name, price: c.current_price });
    });
    return out;
  }

  /* ---------------- panel ---------------- */

  var modal = null;

  function open() {
    css();
    if (!modal) {
      modal = el('div', { id: 'in-modal' });
      modal.appendChild(el('div', { id: 'in-panel' }));
      modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
      document.body.appendChild(modal);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    }
    modal.classList.add('is-on');
    render('<p class="in-sub">Loading…</p>');
    client().then(function () {
      return user ? loadAlerts() : null;
    }).then(function () {
      draw();
      if (user) pullWatchlist();
    }).catch(function () {
      render('<p class="in-err">Could not load the alerts service. Check your connection and try again.</p>');
    });
  }
  function close() { if (modal) modal.classList.remove('is-on'); }

  function render(body) {
    var p = document.getElementById('in-panel');
    if (!p) return;
    p.innerHTML =
      '<div class="in-head"><h2>Price alerts</h2><button class="in-x" type="button" aria-label="Close">×</button></div>' + body;
    p.querySelector('.in-x').addEventListener('click', close);
  }

  async function loadAlerts() {
    var r = await sb.from('alerts').select('*').order('created_at', { ascending: false });
    alerts = r.data || [];
  }

  function draw() {
    if (!user) return drawAuth();
    drawAlerts();
  }

  /* --- signed out --- */
  function drawAuth(msg, ok) {
    render(
      '<p class="in-sub">Get a notification on your phone when a price crosses the level you choose — even with the site closed. ' +
      'An account also keeps your ☆ list the same on every device.</p>' +
      (msg ? '<p class="' + (ok ? 'in-ok' : 'in-err') + '">' + esc(msg) + '</p>' : '') +
      '<label class="in-field">Email<input type="email" id="in-email" autocomplete="email" inputmode="email"></label>' +
      '<label class="in-field">Password<input type="password" id="in-pass" autocomplete="current-password" placeholder="At least 8 characters"></label>' +
      '<div class="in-row"><button class="in-btn in-wide" type="button" id="in-login">Log in</button>' +
      '<button class="in-ghost" type="button" id="in-signup">Create account</button></div>' +
      '<div class="in-sep"></div>' +
      '<p class="in-sub" style="margin:0">Free, and we only store your email, your list and your alerts. Nothing is shared or sold.</p>'
    );
    var p = document.getElementById('in-panel');
    p.querySelector('#in-login').addEventListener('click', function () { auth('login', this); });
    p.querySelector('#in-signup').addEventListener('click', function () { auth('signup', this); });
    p.querySelector('#in-pass').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') document.getElementById('in-login').click();
    });
  }

  async function auth(mode, btn) {
    var email = (document.getElementById('in-email').value || '').trim();
    var pass = document.getElementById('in-pass').value || '';
    if (!email || !pass) return drawAuth('Fill in your email and a password.');
    if (mode === 'signup' && pass.length < 8) return drawAuth('The password needs at least 8 characters.');
    btn.disabled = true;
    try {
      var r = mode === 'signup'
        ? await sb.auth.signUp({ email: email, password: pass })
        : await sb.auth.signInWithPassword({ email: email, password: pass });
      if (r.error) throw r.error;
      // On sign-up with email confirmation switched on there is a user but no
      // session yet: nothing works until the link in the email is opened.
      if (!r.data || !r.data.session) {
        return drawAuth('Account created. Open the link we sent to your email, then log in.', true);
      }
      user = r.data.user || null;
      await loadAlerts();
      drawAlerts();
      pullWatchlist();
    } catch (e) {
      var m = (e && e.message) || 'Something went wrong.';
      if (/invalid login/i.test(m)) m = 'Wrong email or password.';
      if (/already registered/i.test(m)) m = 'That email already has an account — use Log in.';
      drawAuth(m);
    } finally { btn.disabled = false; }
  }

  /* --- signed in --- */
  async function drawAlerts(msg) {
    var state = await pushState();
    var list = assets();
    var options = '';
    var groups = [['crypto', 'Crypto'], ['metal', 'Metals'], ['stock', 'Stocks']];
    groups.forEach(function (g) {
      var rows = list.filter(function (a) { return a.kind === g[0]; });
      if (!rows.length) return;
      options += '<optgroup label="' + g[1] + '">' + rows.map(function (a) {
        return '<option value="' + esc(a.kind + '|' + a.source_id + '|' + a.label) + '" data-price="' + (a.price || '') + '">' +
          esc(a.label) + ' — ' + esc(a.name) + '</option>';
      }).join('') + '</optgroup>';
    });

    var rowsHTML = alerts.length ? alerts.map(function (a) {
      var status = a.active
        ? 'Waiting · last seen $' + (a.last_price != null ? money(a.last_price) : '—')
        : 'Triggered' + (a.fired_at ? ' on ' + new Date(a.fired_at).toLocaleDateString() : '');
      return '<div class="in-alert"><span><strong>' + esc(a.label) + '</strong> ' +
        (a.direction === 'above' ? 'above' : 'below') + ' $' + money(a.target) +
        '<small>' + esc(status) + '</small></span>' +
        '<button class="in-del" type="button" data-del="' + esc(a.id) + '" aria-label="Delete alert">✕</button></div>';
    }).join('') : '<p class="in-sub">No alerts yet. Create your first one below.</p>';

    var notifyHTML = state === 'on'
      ? '<p class="in-ok">🔔 Notifications are on for this device.</p>'
      : (state === 'unsupported'
        ? '<p class="in-sub">This browser cannot show notifications. On an iPhone, install the site as an app first (Share → Add to Home Screen) and open it from the icon.</p>'
        : '<button class="in-btn in-wide" type="button" id="in-notif">Turn on notifications</button>' +
          (standalone() ? '' : '<p class="in-sub" style="margin-top:8px">On an iPhone this only works if you open the site from the installed app icon.</p>'));

    render(
      (msg ? '<p class="in-ok">' + esc(msg) + '</p>' : '') +
      notifyHTML +
      '<div class="in-sep"></div>' +
      '<h3 style="margin:0 0 8px;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#c9a35a;">Your alerts</h3>' +
      rowsHTML +
      '<div class="in-sep"></div>' +
      '<h3 style="margin:0 0 10px;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:#c9a35a;">New alert</h3>' +
      (options
        ? '<label class="in-field">Asset<select id="in-asset">' + options + '</select></label>' +
          '<div class="in-row">' +
          '<label class="in-field">When the price goes<select id="in-dir"><option value="above">above</option><option value="below">below</option></select></label>' +
          '<label class="in-field">Price in $<input type="number" id="in-target" step="any" inputmode="decimal"></label>' +
          '</div>' +
          '<button class="in-btn in-wide" type="button" id="in-add">Create alert</button>'
        : '<p class="in-sub">Open this from the market tracker so the asset list is loaded.</p>') +
      '<div class="in-sep"></div>' +
      '<p class="in-sub" style="margin:0">We check prices every 5 minutes. Each alert fires once, then stops.</p>' +
      '<button class="in-ghost in-wide" type="button" id="in-logout" style="margin-top:12px">Log out</button>'
    );

    var p = document.getElementById('in-panel');
    var notif = p.querySelector('#in-notif');
    if (notif) notif.addEventListener('click', function () {
      var b = this; b.disabled = true;
      enablePush().then(function () { drawAlerts('Notifications are on.'); })
        .catch(function (e) { b.disabled = false; toast(e.message || 'Could not turn them on.'); });
    });

    p.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', async function () {
        var id = this.getAttribute('data-del');
        await sb.from('alerts').delete().eq('id', id);
        alerts = alerts.filter(function (a) { return a.id !== id; });
        drawAlerts();
      });
    });

    var sel = p.querySelector('#in-asset');
    var target = p.querySelector('#in-target');
    function prefill() {
      var o = sel.options[sel.selectedIndex];
      var price = Number(o && o.getAttribute('data-price'));
      var dir = p.querySelector('#in-dir').value;
      if (isFinite(price) && price > 0) {
        var v = dir === 'above' ? price * 1.05 : price * 0.95;
        target.value = v >= 100 ? Math.round(v) : Number(v.toPrecision(4));
      }
    }
    if (sel) {
      sel.addEventListener('change', prefill);
      p.querySelector('#in-dir').addEventListener('change', prefill);
      prefill();
      p.querySelector('#in-add').addEventListener('click', async function () {
        var b = this;
        var parts = (sel.value || '').split('|');
        var value = Number(target.value);
        if (!parts[1] || !isFinite(value) || value <= 0) return toast('Choose an asset and a price.');
        b.disabled = true;
        var r = await sb.from('alerts').insert({
          kind: parts[0], source_id: parts[1], label: parts[2],
          direction: p.querySelector('#in-dir').value, target: value
        }).select().single();
        b.disabled = false;
        if (r.error) return toast(r.error.message || 'Could not create the alert.');
        alerts.unshift(r.data);
        var st = await pushState();
        drawAlerts(st === 'on' ? 'Alert created.' : 'Alert created — turn on notifications to get it.');
      });
    }

    p.querySelector('#in-logout').addEventListener('click', async function () {
      await sb.auth.signOut();
      user = null; alerts = []; mergedOnce = false;
      drawAuth('Logged out.', true);
    });
  }

  /* ---------------- entry point ---------------- */

  function addButton() {
    var nav = document.getElementById('tabs');
    if (!nav || document.getElementById('in-alerts-btn')) return;
    var b = el('button', { id: 'in-alerts-btn', type: 'button', class: 'tab-btn' }, '🔔 Alerts');
    b.addEventListener('click', open);
    nav.appendChild(b);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addButton);
  } else {
    addButton();
  }
})();
