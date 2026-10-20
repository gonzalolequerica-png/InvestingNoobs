#!/usr/bin/env python3
"""Daily build for the "signal from the previous days" on investingnoobs.com.

Runs every day from .github/workflows/market-history.yml and writes:
  - market-history.json   daily closes (up to 120) for stocks, metals and the main cryptos
  - signals.json          7- and 30-day signal + track record per asset (read by the
                          home page, the daily newsletter and the signal alerts)
  - should-i-buy-<asset>-today.html   one page per asset, rebuilt every day
  - signals.html          index of those pages
  - sitemap.xml           the asset pages are kept listed between two markers

Source: Yahoo Finance daily chart (no key). Metals use their futures contracts
(GC=F gold, SI=F silver...), which move with spot prices. If Yahoo fails, Stooq
is tried for stocks.

The scoring is the same as in index.html (analyzeCloses): keep both in sync.
"""
import csv, datetime, html, io, json, math, pathlib, re, sys, time
import urllib.parse, urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
SITE = "https://investingnoobs.com"
KEEP = 120             # daily closes kept per asset
PAGE_STOCKS = 40       # stocks that get their own page (largest first)
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36"}

METALS = [("XAU", "GC=F", "Gold"), ("XAG", "SI=F", "Silver"), ("XPT", "PL=F", "Platinum"),
          ("XPD", "PA=F", "Palladium"), ("HG", "HG=F", "Copper")]

# CoinGecko id (what the tracker uses) -> Yahoo ticker, name. Stablecoins left out.
CRYPTOS = [
    ("bitcoin", "BTC-USD", "Bitcoin"), ("ethereum", "ETH-USD", "Ethereum"),
    ("ripple", "XRP-USD", "XRP"), ("binancecoin", "BNB-USD", "BNB"),
    ("solana", "SOL-USD", "Solana"), ("dogecoin", "DOGE-USD", "Dogecoin"),
    ("cardano", "ADA-USD", "Cardano"), ("tron", "TRX-USD", "TRON"),
    ("chainlink", "LINK-USD", "Chainlink"), ("avalanche-2", "AVAX-USD", "Avalanche"),
    ("stellar", "XLM-USD", "Stellar"), ("sui", "SUI20947-USD", "Sui"),
    ("hedera-hashgraph", "HBAR-USD", "Hedera"), ("bitcoin-cash", "BCH-USD", "Bitcoin Cash"),
    ("litecoin", "LTC-USD", "Litecoin"), ("shiba-inu", "SHIB-USD", "Shiba Inu"),
    ("polkadot", "DOT-USD", "Polkadot"), ("uniswap", "UNI7083-USD", "Uniswap"),
    ("near", "NEAR-USD", "NEAR Protocol"), ("aave", "AAVE-USD", "Aave"),
    ("pepe", "PEPE24478-USD", "Pepe"), ("internet-computer", "ICP-USD", "Internet Computer"),
    ("monero", "XMR-USD", "Monero"), ("ethereum-classic", "ETC-USD", "Ethereum Classic"),
    ("cosmos", "ATOM-USD", "Cosmos"), ("aptos", "APT21794-USD", "Aptos"),
    ("filecoin", "FIL-USD", "Filecoin"), ("arbitrum", "ARB11841-USD", "Arbitrum"),
    ("render-token", "RENDER-USD", "Render"), ("algorand", "ALGO-USD", "Algorand"),
]

LEVELS = {
    "favorable":   ("Favorable",   "#3fa06e"),
    "leaning":     ("Leaning up",  "#8cc084"),
    "wait":        ("Wait",        "#e0b84d"),
    "unfavorable": ("Unfavorable", "#c05a52"),
    "stable":      ("Stable",      "#7d8796"),
}


# ───────────────────────── data ─────────────────────────
def stock_meta():
    src = (ROOT / "index.html").read_text(encoding="utf-8")
    block = src[src.index("const STOCK_META = ["):]
    block = block[: block.index("];")]
    return re.findall(r"symbol:\s*'([^']+)',\s*name:\s*(?:'([^']*)'|\"([^\"]*)\")", block)


def get(url, timeout=20):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def yahoo(ticker):
    q = urllib.parse.quote(ticker)
    for host in ("query1", "query2"):
        try:
            data = json.loads(get(f"https://{host}.finance.yahoo.com/v8/finance/chart/{q}?range=6mo&interval=1d"))
            res = data["chart"]["result"][0]
            ts = res.get("timestamp") or []
            closes = res["indicators"]["quote"][0]["close"]
            pairs = [(t, c) for t, c in zip(ts, closes) if c is not None]
            # Drop today's still-moving bar for markets that are open: keep closes only.
            return [round(c, 8 if c < 0.01 else (6 if c < 1 else 4)) for _, c in pairs][-KEEP:]
        except Exception:  # noqa: BLE001
            time.sleep(1)
    return None


def stooq(symbol):
    try:
        raw = get(f"https://stooq.com/q/d/l/?s={symbol.lower().replace('.', '-')}.us&i=d").decode()
        rows = list(csv.DictReader(io.StringIO(raw)))
        closes = [float(r["Close"]) for r in rows if r.get("Close") not in (None, "", "N/D")]
        return [round(c, 4) for c in closes][-KEEP:] or None
    except Exception:  # noqa: BLE001
        return None


# ───────────────────────── signal (mirror of index.html) ─────────────────────────
def analyze(closes):
    if not closes or len(closes) < 4:
        return None
    n, last, first = len(closes), closes[-1], closes[0]
    rets = [(closes[i] / closes[i - 1] - 1) * 100 for i in range(1, n)]
    change = (last / first - 1) * 100
    avg = sum(closes) / n
    up_days = sum(1 for r in rets if r > 0)
    up_share = up_days / len(rets)
    last3 = (last / closes[max(0, n - 4)] - 1) * 100
    mean = sum(rets) / len(rets)
    vol = math.sqrt(sum((r - mean) ** 2 for r in rets) / len(rets))
    vs_avg = (last / avg - 1) * 100
    score = 0
    score += 1 if change > 2 else (-1 if change < -2 else 0)
    score += 1 if vs_avg > 0.5 else (-1 if vs_avg < -0.5 else 0)
    score += 1 if up_share >= 0.6 else (-1 if up_share <= 0.4 else 0)
    score += 1 if last3 > 1 else (-1 if last3 < -1 else 0)
    if vol < 0.3 and abs(change) < 1:
        level = "stable"
    elif score >= 3:
        level = "favorable"
    elif score >= 1:
        level = "leaning"
    elif score >= -1:
        level = "wait"
    else:
        level = "unfavorable"
    return {"level": level, "score": score, "change": round(change, 2), "upDays": up_days,
            "days": len(rets), "vsAvg": round(vs_avg, 2), "last3": round(last3, 2), "vol": round(vol, 2)}


def track_record(closes, window=7, horizon=7):
    """How the 7-day signal did in the past: after each Favorable / Unfavorable day,
    what did the price do over the next `horizon` closes?"""
    fav = unf = fav_up = unf_down = base = base_up = 0
    fav_ret = []
    for t in range(window, len(closes) - horizon):
        a = analyze(closes[t - window: t + 1])
        fwd = closes[t + horizon] / closes[t] - 1
        base += 1
        base_up += fwd > 0
        if a and a["level"] == "favorable":
            fav += 1; fav_up += fwd > 0; fav_ret.append(fwd)
        elif a and a["level"] == "unfavorable":
            unf += 1; unf_down += fwd < 0
    if base < 10:
        return None
    return {"favN": fav, "favUp": fav_up, "unfN": unf, "unfDown": unf_down,
            "baseN": base, "baseUp": base_up,
            "favAvg": round(sum(fav_ret) / len(fav_ret) * 100, 2) if fav_ret else None,
            "horizon": horizon}


# ───────────────────────── pages ─────────────────────────
def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def money(v):
    if v is None:
        return "—"
    if v >= 1000:
        return "${:,.0f}".format(v)
    if v >= 1:
        return "${:,.2f}".format(v)
    return "${:.6f}".format(v).rstrip("0")


def pct(v):
    return ("+" if v >= 0 else "") + f"{v:.1f}%"


def spark_svg(closes, color, w=320, h=90):
    lo, hi = min(closes), max(closes)
    span = (hi - lo) or 1
    pts = " ".join(f"{i * w / (len(closes) - 1):.1f},{h - 6 - (c - lo) / span * (h - 12):.1f}" for i, c in enumerate(closes))
    return (f'<svg viewBox="0 0 {w} {h}" width="100%" height="{h}" preserveAspectRatio="none" role="img" '
            f'aria-label="Daily closes, last {len(closes) - 1} days"><polyline fill="none" stroke="{color}" '
            f'stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" points="{pts}"/></svg>')


def verdict_text(name, a):
    lvl = a["level"]
    if lvl == "favorable":
        return f"{name} has been rising steadily over the last {a['days']} days. That is the most favorable backdrop the signal can show — it describes the past, not tomorrow."
    if lvl == "leaning":
        return f"The last {a['days']} days lean positive for {name}, but not every check agrees. A reasonable moment to start small, rather than all at once."
    if lvl == "wait":
        return f"{name} has no clear direction over the last {a['days']} days. Most beginners do better waiting for the picture to clear up."
    if lvl == "unfavorable":
        return f"{name} has been falling over the last {a['days']} days. Buying into a drop is a bet that it stops — the signal says wait."
    return f"{name} has barely moved over the last {a['days']} days."


PAGE_CSS = """
:root{--bg:#0b0f14;--card:#10151c;--line:#242b35;--text:#eceef1;--muted:#8b93a0;--gold:#c9a35a}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.65 'Inter',-apple-system,Segoe UI,Helvetica,Arial,sans-serif}
.wrap{max-width:760px;margin:0 auto;padding:28px 16px 60px}a{color:#4ed3df}
.top{display:flex;justify-content:space-between;gap:12px;font-size:13px;margin-bottom:26px}.top a{color:var(--muted);text-decoration:none}
.eyebrow{font:600 11px/1 'IBM Plex Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--gold)}
h1{font:600 clamp(28px,5vw,40px)/1.15 'Fraunces',Georgia,serif;margin:10px 0 8px}
h2{font:600 21px/1.3 'Fraunces',Georgia,serif;margin:30px 0 10px}
.muted{color:var(--muted)}.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px;margin:18px 0}
.verdict{font-size:30px;font-weight:700;line-height:1.1;margin:6px 0 10px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:14px}
.cell{border:1px solid var(--line);border-radius:10px;padding:11px 13px;background:#0d1218}
.cell b{display:block;font-size:17px;margin-top:4px}.cell span{font:600 10px/1 'IBM Plex Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
table{width:100%;border-collapse:collapse;font-size:14px}td,th{padding:8px 6px;border-bottom:1px solid var(--line);text-align:left}
.btn{display:inline-block;padding:11px 18px;border-radius:10px;background:var(--gold);color:#0b0f14;text-decoration:none;font-weight:700}
.list a{display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);color:var(--text);text-decoration:none}
.pill{font-size:12px;padding:3px 10px;border-radius:20px;white-space:nowrap;font-weight:600}
"""


def head(title, desc, url):
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="google-adsense-account" content="ca-pub-4483309337875295">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4483309337875295" crossorigin="anonymous"></script>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{url}">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<meta property="og:type" content="article"><meta property="og:site_name" content="InvestingNoobs">
<meta property="og:title" content="{html.escape(title)}"><meta property="og:description" content="{html.escape(desc)}">
<meta property="og:url" content="{url}"><meta property="og:image" content="{SITE}/og-images/site.png">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="{html.escape(title)}">
<meta name="twitter:description" content="{html.escape(desc)}"><meta name="twitter:image" content="{SITE}/og-images/site.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:wght@600&family=IBM+Plex+Mono:wght@500;600&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>{PAGE_CSS}</style>
"""


def asset_page(asset, today):
    name, closes, s7, s30, tr = asset["name"], asset["closes"], asset["s7"], asset.get("s30"), asset.get("track")
    label, color = LEVELS[s7["level"]]
    url = f"{SITE}/{asset['page']}"
    title = f"Should I buy {name} today? {label} — 7-day signal ({today:%d %b %Y})"
    desc = (f"{name} over the last 7 days: {pct(s7['change'])}, {s7['upDays']} of {s7['days']} days up. "
            f"Today's signal: {label}. A plain-English read of the previous days, updated daily.")
    faq = {
        "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": f"Is it a good time to buy {name} today?",
             "acceptedAnswer": {"@type": "Answer", "text": verdict_text(name, s7) + " This is not financial advice."}},
            {"@type": "Question", "name": f"How is the {name} signal calculated?",
             "acceptedAnswer": {"@type": "Answer", "text": "From the daily closing prices of the previous 7 days: the 7-day change, the price versus its 7-day average, how many days closed up and the direction of the last 3 days."}},
        ],
    }
    rows = []
    if s30:
        l30, c30 = LEVELS[s30["level"]]
        rows.append(f"<tr><td>Last 30 days</td><td style='color:{c30};font-weight:600'>{l30}</td><td>{pct(s30['change'])}</td><td>{s30['upDays']}/{s30['days']} up</td></tr>")
    rows.insert(0, f"<tr><td>Last 7 days</td><td style='color:{color};font-weight:600'>{label}</td><td>{pct(s7['change'])}</td><td>{s7['upDays']}/{s7['days']} up</td></tr>")
    track_html = ""
    if tr and tr["favN"] >= 3:
        rate = round(tr["favUp"] / tr["favN"] * 100)
        base = round(tr["baseUp"] / tr["baseN"] * 100)
        track_html = (f"<h2>Has this signal worked for {html.escape(name)}?</h2><p>Over the last {len(closes)} daily closes, "
                      f"{html.escape(name)} was <b>Favorable</b> on {tr['favN']} days. Seven days later the price was higher "
                      f"<b>{rate}%</b> of those times, against {base}% for any random day. "
                      + ("That is better than chance, but far from a sure thing." if rate > base + 5 else
                         "That is no better than picking a random day — treat the signal as context, not a forecast.")
                      + "</p>")
    return head(title, desc, url) + f"""<script type="application/ld+json">{json.dumps(faq)}</script>
</head><body><main class="wrap">
<div class="top"><a href="index.html"><strong style="color:var(--text)">◆ InvestingNoobs</strong></a><a href="signals.html">All signals →</a></div>
<div class="eyebrow">{html.escape(asset['kindLabel'])} · signal updated {today:%d %B %Y}</div>
<h1>Should I buy {html.escape(name)} today?</h1>
<p class="muted">We only look at what already happened: the daily closes of the previous days. No predictions, no hype.</p>
<section class="card" aria-label="Today's signal">
  <div class="eyebrow" style="color:var(--muted)">Signal · last 7 days</div>
  <div class="verdict" style="color:{color}">{label}</div>
  <p style="margin:0 0 12px">{html.escape(verdict_text(name, s7))}</p>
  {spark_svg(closes[-31:] if len(closes) > 31 else closes, color)}
  <div class="grid">
    <div class="cell"><span>Last close</span><b>{money(closes[-1])}</b></div>
    <div class="cell"><span>7-day change</span><b style="color:{'#3fa06e' if s7['change'] >= 0 else '#c05a52'}">{pct(s7['change'])}</b></div>
    <div class="cell"><span>Days up</span><b>{s7['upDays']} of {s7['days']}</b></div>
    <div class="cell"><span>Vs 7-day average</span><b>{pct(s7['vsAvg'])}</b></div>
  </div>
  {'<p style="color:#e08a4d;margin:12px 0 0">⚡ Big swings: it has moved about ' + f"{s7['vol']:.1f}" + '% a day on average. Only use money you can afford to see drop fast.</p>' if s7['vol'] > 6 else ''}
</section>
<table><thead><tr><th>Window</th><th>Signal</th><th>Change</th><th>Days up</th></tr></thead><tbody>{''.join(rows)}</tbody></table>
{track_html}
<h2>How the signal works</h2>
<p>Four checks on the previous 7 daily closes: is the 7-day change above +2% or below −2%; is the price above or below its 7-day average; did most days close up or down; and where did the last 3 days go. Four positives make it <b>Favorable</b>, mostly positives <b>Leaning up</b>, a mix <b>Wait</b>, mostly negatives <b>Unfavorable</b>.</p>
<p class="muted">This page describes the recent past. It is not financial advice and it does not know what happens next. Prices can fall even after a Favorable week, and you can lose money.</p>
<p style="margin-top:24px"><a class="btn" href="index.html#market-view">See every asset live →</a></p>
<p class="muted" style="font-size:13px;margin-top:20px">Want a notification when the {html.escape(name)} signal changes? Open the <a href="index.html">tracker</a> and set a signal alert. · New to this? Start with the <a href="blog.html">free 50-lesson course</a>.</p>
</main></body></html>
"""


def index_page(assets, today):
    groups = [("Crypto", "crypto"), ("Metals", "metal"), ("Stocks", "stock")]
    parts = []
    for title, kind in groups:
        items = sorted((a for a in assets if a["kind"] == kind and a.get("page")),
                       key=lambda a: -a["s7"]["score"] if a["s7"]["level"] != "stable" else 0)
        if not items:
            continue
        links = "".join(
            f'<a href="{a["page"]}"><span>Should I buy {html.escape(a["name"])} today?</span>'
            f'<span class="pill" style="color:{LEVELS[a["s7"]["level"]][1]};background:{LEVELS[a["s7"]["level"]][1]}18">{LEVELS[a["s7"]["level"]][0]}</span></a>'
            for a in items)
        parts.append(f"<h2>{title}</h2><div class='list'>{links}</div>")
    title = "Should I invest today? 7-day signals for crypto, stocks and metals"
    desc = "Every asset gets one simple signal built from its previous 7 days: Favorable, Leaning up, Wait or Unfavorable. Updated daily, free, no jargon."
    return head(title, desc, f"{SITE}/signals.html") + f"""</head><body><main class="wrap">
<div class="top"><a href="index.html"><strong style="color:var(--text)">◆ InvestingNoobs</strong></a><a href="index.html#market-view">Live tracker →</a></div>
<div class="eyebrow">Updated {today:%d %B %Y}</div>
<h1>Should I invest today?</h1>
<p class="muted">One signal per asset, built only from the daily closes of the previous 7 days. Not a prediction and not financial advice.</p>
{''.join(parts)}
</main></body></html>
"""


def update_sitemap(pages, today):
    path = ROOT / "sitemap.xml"
    xml = path.read_text(encoding="utf-8")
    start, end = "  <!-- signals:start -->\n", "  <!-- signals:end -->\n"
    block = start + "".join(
        f"  <url><loc>{SITE}/{p}</loc><lastmod>{today:%Y-%m-%d}</lastmod><changefreq>daily</changefreq><priority>{'0.9' if p == 'signals.html' else '0.7'}</priority></url>\n"
        for p in pages) + end
    if start in xml:
        xml = xml[: xml.index(start)] + block + xml[xml.index(end) + len(end):]
    else:
        xml = xml.replace("</urlset>", block + "</urlset>")
    xml = re.sub(r"(<loc>https://investingnoobs.com/</loc><lastmod>)[^<]*", r"\g<1>" + f"{today:%Y-%m-%d}", xml)
    path.write_text(xml, encoding="utf-8")


# ───────────────────────── main ─────────────────────────
def main():
    today = datetime.datetime.utcnow()
    jobs = []
    for i, (sym, n1, n2) in enumerate(stock_meta()):
        jobs.append({"key": sym, "name": n1 or n2, "kind": "stock", "kindLabel": "Stock", "ticker": sym.replace(".", "-"),
                     "page": f"should-i-buy-{slugify(n1 or n2)}-stock-today.html" if i < PAGE_STOCKS else None})
    for key, ticker, name in METALS:
        jobs.append({"key": key, "name": name, "kind": "metal", "kindLabel": "Metal", "ticker": ticker,
                     "page": f"should-i-buy-{slugify(name)}-today.html"})
    for key, ticker, name in CRYPTOS:
        jobs.append({"key": key, "name": name, "kind": "crypto", "kindLabel": "Crypto", "ticker": ticker,
                     "page": f"should-i-buy-{slugify(name)}-today.html"})

    series, assets, failed = {}, [], []
    for i, j in enumerate(jobs, 1):
        closes = yahoo(j["ticker"])
        if not closes and j["kind"] == "stock":
            closes = stooq(j["key"])
        if closes and len(closes) >= 8:
            series[j["key"]] = closes
            j["closes"] = closes
            j["s7"] = analyze(closes[-8:])
            j["s30"] = analyze(closes[-31:]) if len(closes) >= 31 else None
            j["track"] = track_record(closes)
            assets.append(j)
        else:
            failed.append(j["ticker"])
        if i % 25 == 0:
            print(f"{i}/{len(jobs)} done, {len(series)} with data")
        time.sleep(0.2)

    print(f"{len(series)}/{len(jobs)} assets with data. Failed: {', '.join(failed[:30])}")
    if len(series) < len(jobs) * 0.5:
        print("Too many failures; keeping the previous files.")
        sys.exit(1)

    stamp = today.strftime("%Y-%m-%dT%H:%MZ")
    (ROOT / "market-history.json").write_text(json.dumps(
        {"updated": stamp, "source": "Yahoo Finance daily closes", "series": series}, separators=(",", ":")), encoding="utf-8")

    counts = {k: 0 for k in LEVELS}
    for a in assets:
        if a["kind"] == "crypto":
            counts[a["s7"]["level"]] += 1
    signals = {
        "updated": stamp,
        "cryptoCounts": counts,
        "assets": {a["key"]: {
            "name": a["name"], "kind": a["kind"], "close": a["closes"][-1], "page": a.get("page"),
            "s7": a["s7"], "s30": a["s30"], "track": a["track"],
        } for a in assets},
    }
    (ROOT / "signals.json").write_text(json.dumps(signals, separators=(",", ":")), encoding="utf-8")

    pages = ["signals.html"]
    for a in assets:
        if a.get("page"):
            (ROOT / a["page"]).write_text(asset_page(a, today), encoding="utf-8")
            pages.append(a["page"])
    (ROOT / "signals.html").write_text(index_page(assets, today), encoding="utf-8")
    update_sitemap(pages, today)
    print(f"Wrote market-history.json, signals.json and {len(pages)} pages.")


if __name__ == "__main__":
    main()
