/* InvestingNoobs — shared app layer.
   Adds: service worker registration, install-as-app button, day streak,
   course progress card on the home page and milestone badges.
   Every piece is defensive: if something is missing the page just carries on. */
(function () {
  'use strict';

  var TOTAL = 50;
  var PROGRESS_KEY = 'in_course_progress';
  var STREAK_KEY = 'in_streak';

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function yesterday() {
    var d = new Date(Date.now() - 86400000);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* ---------- streak ---------- */
  function bumpStreak() {
    var s = read(STREAK_KEY, null);
    if (!s || typeof s !== 'object') s = { last: null, n: 0, best: 0 };
    var t = today();
    if (s.last !== t) {
      s.n = s.last === yesterday() ? (s.n || 0) + 1 : 1;
      s.last = t;
      if (s.n > (s.best || 0)) s.best = s.n;
      write(STREAK_KEY, s);
    }
    return s;
  }

  function doneCount() {
    var d = read(PROGRESS_KEY, []);
    return Array.isArray(d) ? d.length : 0;
  }

  /* ---------- badges ---------- */
  var BADGES = [
    { id: 'first', need: 1, icon: '🌱', name: 'First step' },
    { id: 'five', need: 5, icon: '📘', name: '5 lessons' },
    { id: 'ten', need: 10, icon: '🧭', name: '10 lessons' },
    { id: 'half', need: 25, icon: '⛰️', name: 'Halfway' },
    { id: 'all', need: TOTAL, icon: '🏆', name: 'Course complete' }
  ];

  function badgesHTML(done) {
    return BADGES.map(function (b) {
      var got = done >= b.need;
      return '<span class="in-badge' + (got ? ' is-on' : '') + '" title="' +
        (got ? b.name : b.need + ' lessons to unlock') + '">' + b.icon + '</span>';
    }).join('');
  }

  /* ---------- styles ---------- */
  function injectCSS() {
    if (document.getElementById('in-app-css')) return;
    var css = document.createElement('style');
    css.id = 'in-app-css';
    css.textContent = [
      '.in-card{max-width:none;margin:0 auto 20px;padding:16px 18px;border:1px solid var(--line,#242b35);',
      'border-radius:12px;background:var(--surface,#12161d);display:flex;flex-direction:column;gap:12px;}',
      '.in-card-top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}',
      '.in-kicker{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold,#c9a35a);font-weight:700;}',
      '.in-streak{font-size:12px;color:var(--muted,#8b93a0);white-space:nowrap;}',
      '.in-line{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;}',
      '.in-line strong{font-size:15px;color:var(--text,#eceef1);}',
      '.in-next{font-size:12.5px;color:var(--muted,#8b93a0);overflow:hidden;text-overflow:ellipsis;}',
      '.in-track{height:8px;border-radius:6px;background:#1c2634;border:1px solid var(--line,#242b35);overflow:hidden;}',
      '.in-fill{height:100%;width:0;background:linear-gradient(90deg,var(--gold,#c9a35a),#e8c987);transition:width .6s ease;}',
      '.in-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}',
      '.in-btn{display:inline-block;padding:9px 16px;border-radius:9px;background:var(--gold,#c9a35a);color:#0b0f14;',
      'font-weight:700;font-size:13.5px;text-decoration:none;border:0;cursor:pointer;font-family:inherit;}',
      '.in-btn:hover{filter:brightness(1.08);}',
      '.in-badges{display:flex;gap:6px;}',
      '.in-badge{width:28px;height:28px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;',
      'font-size:14px;background:#161d28;border:1px solid var(--line,#242b35);filter:grayscale(1);opacity:.35;}',
      '.in-badge.is-on{filter:none;opacity:1;border-color:var(--gold,#c9a35a);}',
      '@media(max-width:600px){.in-line strong{font-size:14px;}.in-next{width:100%;}}'
    ].join('');
    document.head.appendChild(css);
  }

  /* ---------- home card ---------- */
  function slugTitle(url) {
    var m = String(url || '').match(/^lesson-\d+-(.+)\.html$/);
    if (!m) return '';
    var words = m[1].split('-').join(' ').replace(/\bi\b/g, 'I');
    return words.charAt(0).toUpperCase() + words.slice(1);
  }

  function nextLesson() {
    var map = window.LESSON_URLS || null;
    if (!map) return null;
    var done = read(PROGRESS_KEY, []);
    var set = new Set(Array.isArray(done) ? done : []);
    for (var i = 1; i <= TOTAL; i++) {
      var id = 'l' + i;
      if (!set.has(id) && map[id]) return { id: id, url: map[id], title: slugTitle(map[id]), n: i };
    }
    return null;
  }

  function renderHomeCard() {
    var anchor = document.getElementById('home-primary') || document.querySelector('.start-paths');
    if (!anchor || document.getElementById('in-course-card')) return;

    var done = doneCount();
    var streak = read(STREAK_KEY, { n: 0 });
    var next = nextLesson();
    var pct = Math.round((done / TOTAL) * 100);

    var card = document.createElement('section');
    card.className = 'in-card';
    card.id = 'in-course-card';
    card.setAttribute('aria-label', 'Your course progress');

    var head = done === 0
      ? '<strong>Start the free 50-lesson course</strong>'
      : '<strong>' + done + ' of ' + TOTAL + ' lessons done</strong>';
    var nextText = next
      ? '<span class="in-next">Next: ' + next.title + '</span>'
      : '<span class="in-next">You finished every lesson. Take the final test →</span>';
    var link = next ? next.url : 'test.html';
    var label = done === 0 ? 'Start lesson 1 →' : (next ? 'Continue →' : 'Final test →');
    var streakText = (streak && streak.n > 1)
      ? '🔥 ' + streak.n + ' days in a row'
      : '';

    card.innerHTML =
      '<div class="in-card-top"><span class="in-kicker">Your course</span>' +
      '<span class="in-streak">' + streakText + '</span></div>' +
      '<div class="in-line">' + head + nextText + '</div>' +
      '<div class="in-track"><div class="in-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="in-actions"><a class="in-btn" href="' + link + '">' + label + '</a>' +
      '<span class="in-badges">' + badgesHTML(done) + '</span></div>';

    anchor.parentNode.insertBefore(card, anchor.nextSibling);
  }

  /* ---------- badges on the course index ---------- */
  function renderCourseBadges() {
    var card = document.querySelector('.progress-card');
    if (!card || document.getElementById('in-course-badges')) return;
    var done = doneCount();
    var streak = read(STREAK_KEY, { n: 0 });
    var row = document.createElement('div');
    row.id = 'in-course-badges';
    row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;flex-wrap:wrap;';
    row.innerHTML = '<span class="in-badges">' + badgesHTML(done) + '</span>' +
      '<span class="in-streak">' + (streak && streak.n > 1 ? '🔥 ' + streak.n + ' days in a row' : '') + '</span>';
    card.appendChild(row);
  }

  /* ---------- install as app ---------- */
  var deferredPrompt = null;
  function standalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }
  function addInstallButton() {
    var nav = document.getElementById('tabs');
    if (!nav || document.getElementById('in-install') || standalone()) return;
    var b = document.createElement('button');
    b.id = 'in-install';
    b.type = 'button';
    b.className = 'tab-btn';
    b.textContent = '📲 Install app';
    b.addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () {
        deferredPrompt = null;
        b.remove();
      });
    });
    nav.appendChild(b);
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    addInstallButton();
  });
  window.addEventListener('appinstalled', function () {
    var b = document.getElementById('in-install');
    if (b) b.remove();
  });

  /* ---------- weekly email sign-up ---------- */
  var NEWS_URL = 'https://yreinzemfharuuvumduq.supabase.co/functions/v1/newsletter';

  function newsletterCSS() {
    if (document.getElementById('in-news-css')) return;
    var s = document.createElement('style');
    s.id = 'in-news-css';
    s.textContent = [
      '.in-news{max-width:none;margin:24px auto;padding:20px 20px 18px;border:1px solid var(--line,#242b35);',
      'border-radius:14px;background:linear-gradient(135deg,rgba(201,163,90,.08),var(--surface,#12161d));}',
      '.in-news h3{margin:6px 0 6px;font-family:Fraunces,Georgia,serif;font-weight:600;font-size:19px;color:var(--text,#eceef1);}',
      '.in-news p{margin:0 0 14px;color:var(--muted,#8b93a0);font-size:13.5px;line-height:1.55;}',
      '.in-news form{display:flex;gap:8px;flex-wrap:wrap;}',
      '.in-news input[type=email]{flex:1;min-width:200px;padding:11px 13px;border-radius:9px;background:#151b24;',
      'border:1px solid var(--line,#242b35);color:var(--text,#eceef1);font-size:15px;font-family:inherit;}',
      '.in-news input[type=email]:focus{outline:none;border-color:var(--gold,#c9a35a);}',
      '.in-news .in-consent{display:flex;align-items:flex-start;gap:8px;margin-top:11px;color:var(--muted,#8b93a0);',
      'font-size:11.5px;line-height:1.5;}',
      '.in-news .in-consent input{margin-top:2px;flex:none;accent-color:var(--gold,#c9a35a);}',
      '.in-news a{color:var(--gold,#c9a35a);}',
      '.in-news .in-msg{margin:10px 0 0;font-size:13.5px;}',
      '.in-news .in-msg.bad{color:#ff9b9b;}.in-news .in-msg.good{color:#7fd6a5;}'
    ].join('');
    document.head.appendChild(s);
  }

  function newsletterHTML(source) {
    return '<span class="in-kicker">Daily email</span>' +
      '<h3>One email a day, in plain English</h3>' +
      '<p>What moved in crypto, metals and stocks in the last 24 hours, and what those moves mean. ' +
      'Two minutes with your coffee. No tips, no hype, nobody telling you what to buy.</p>' +
      '<form novalidate>' +
      '<input type="email" placeholder="your@email.com" autocomplete="email" aria-label="Your email" required>' +
      '<button class="in-btn" type="submit">Subscribe</button>' +
      '</form>' +
      '<label class="in-consent"><input type="checkbox">' +
      '<span>Yes, email me the daily round-up. I can unsubscribe from any email, in one click. ' +
      '<a href="/privacy/">Privacy policy</a>.</span></label>' +
      '<p class="in-msg" hidden></p>' +
      '<input type="hidden" value="' + source + '">';
  }

  function wireNewsletter(box, source) {
    var form = box.querySelector('form');
    var input = box.querySelector('input[type=email]');
    var consent = box.querySelector('input[type=checkbox]');
    var msg = box.querySelector('.in-msg');
    var btn = box.querySelector('button');

    function say(text, good) {
      msg.textContent = text;
      msg.className = 'in-msg ' + (good ? 'good' : 'bad');
      msg.hidden = false;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (input.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return say('That email does not look right.', false);
      if (!consent.checked) return say('Tick the box so we know you want the emails.', false);
      btn.disabled = true;
      say('Sending…', true);
      fetch(NEWS_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email, source: source })
      }).then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
        .then(function (res) {
          btn.disabled = false;
          if (res.j && res.j.ok) {
            if (res.j.already) return say('You are already on the list.', true);
            form.hidden = true;
            consent.parentNode.hidden = true;
            say('You are on the list. The next issue goes out tomorrow morning.', true);
            try { localStorage.setItem('in_news', '1'); } catch (_) {}
          } else if (res.s === 429) {
            say('Too many sign-ups from here. Try again later.', false);
          } else {
            say('Could not sign you up right now. Try again in a minute.', false);
          }
        })
        .catch(function () { btn.disabled = false; say('No connection. Try again in a minute.', false); });
    });
  }

  function renderNewsletter() {
    if (document.querySelector('.in-news')) return;
    try { if (localStorage.getItem('in_news') === '1') return; } catch (_) {}

    // On the home page the sign-up sits under the table, so the top of the
    // page stays clean; on the course page it goes after the final card.
    var anchor = null, source = 'site';
    var market = document.getElementById('market-view');
    var finalCard = document.querySelector('.final-card');
    if (market) { anchor = market; source = 'home'; }
    else if (finalCard) { anchor = finalCard; source = 'course'; }
    if (!anchor) return;

    newsletterCSS();
    var box = document.createElement('section');
    box.className = 'in-news';
    box.setAttribute('aria-label', 'Daily email sign-up');
    box.innerHTML = newsletterHTML(source);
    anchor.parentNode.insertBefore(box, anchor.nextSibling);
    wireNewsletter(box, source);
  }

  /* ---------- boot ---------- */
  function boot() {
    injectCSS();
    bumpStreak();
    renderHomeCard();
    renderCourseBadges();
    renderNewsletter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }
})();
