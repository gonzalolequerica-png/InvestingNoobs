#!/usr/bin/env python3
"""Builds market-history.json: the daily closes of the previous days for every
stock and metal shown on the home page. The "Signal (last 7 days)" column reads it.

Runs every weekday evening from .github/workflows/market-history.yml.
Source: Yahoo Finance daily chart (no key needed). Metals use their futures
contracts (GC=F gold, SI=F silver...), which move together with spot prices.
"""
import json, re, sys, time, urllib.parse, urllib.request, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parent
KEEP = 30  # daily closes kept per asset

METALS = {"XAU": "GC=F", "XAG": "SI=F", "XPT": "PL=F", "XPD": "PA=F", "HG": "HG=F"}
UA = {"User-Agent": "Mozilla/5.0 (compatible; InvestingNoobsBot/1.0; +https://investingnoobs.com)"}


def stock_symbols():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    block = html[html.index("const STOCK_META = ["):]
    block = block[: block.index("];")]
    return re.findall(r"symbol:\s*'([^']+)'", block)


def daily_closes(ticker):
    url = ("https://query1.finance.yahoo.com/v8/finance/chart/"
           + urllib.parse.quote(ticker) + "?range=3mo&interval=1d")
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=20) as r:
                data = json.load(r)
            res = data["chart"]["result"][0]
            closes = res["indicators"]["quote"][0]["close"]
            out = [round(c, 6 if c < 1 else 4) for c in closes if c is not None]
            return out[-KEEP:]
        except Exception as e:  # noqa: BLE001
            err = e
            time.sleep(2 + attempt * 3)
    print(f"  ! {ticker}: {err}", file=sys.stderr)
    return None


def main():
    series = {}
    jobs = [(s, s.replace(".", "-")) for s in stock_symbols()] + list(METALS.items())
    for i, (key, ticker) in enumerate(jobs, 1):
        closes = daily_closes(ticker)
        if closes and len(closes) >= 4:
            series[key] = closes
        if i % 25 == 0:
            print(f"{i}/{len(jobs)} done, {len(series)} with data")
        time.sleep(0.25)
    if len(series) < len(jobs) * 0.5:
        print(f"Only {len(series)}/{len(jobs)} assets came back; keeping the previous file.")
        sys.exit(1)
    out = {
        "updated": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ"),
        "source": "Yahoo Finance daily closes",
        "series": series,
    }
    (ROOT / "market-history.json").write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote market-history.json with {len(series)} assets.")


if __name__ == "__main__":
    main()
