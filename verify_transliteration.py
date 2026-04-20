#!/usr/bin/env python3
"""
Verify transliteration column in verses_export.csv against two reference sources:
  ref1: alquran.cloud  en.transliteration  (per-surah)
  ref2: Quran.com API  translations/57     (bulk sequential, no verse_key)
Flags verses that score below thresholds on BOTH references simultaneously.
"""
import csv
import difflib
import json
import re
import sys
import time
import unicodedata
from urllib.request import urlopen, Request
from urllib.error import URLError, HTTPError

LOCAL_CSV  = "verses_export.csv"
OUTPUT_CSV = "transliteration_verification_report.csv"

CHAR_SIM_THRESHOLD  = 0.60
TOKEN_SIM_THRESHOLD = 0.50
DELAY               = 0.25   # seconds between requests

# Canonical Hafs verse counts (for sequential mapping of ref2)
VERSE_COUNTS = {
    1: 7, 2: 286, 3: 200, 4: 176, 5: 120, 6: 165, 7: 206, 8: 75,
    9: 129, 10: 109, 11: 123, 12: 111, 13: 43, 14: 52, 15: 99,
    16: 128, 17: 111, 18: 110, 19: 98, 20: 135, 21: 112, 22: 78,
    23: 118, 24: 64, 25: 77, 26: 227, 27: 93, 28: 88, 29: 69,
    30: 60, 31: 34, 32: 30, 33: 73, 34: 54, 35: 45, 36: 83,
    37: 182, 38: 88, 39: 75, 40: 85, 41: 54, 42: 53, 43: 89,
    44: 59, 45: 37, 46: 35, 47: 38, 48: 29, 49: 18, 50: 45,
    51: 60, 52: 49, 53: 62, 54: 55, 55: 78, 56: 96, 57: 29,
    58: 22, 59: 24, 60: 13, 61: 14, 62: 11, 63: 11, 64: 18,
    65: 12, 66: 12, 67: 30, 68: 52, 69: 52, 70: 44, 71: 28,
    72: 28, 73: 20, 74: 56, 75: 40, 76: 31, 77: 50, 78: 40,
    79: 46, 80: 42, 81: 29, 82: 19, 83: 36, 84: 25, 85: 22,
    86: 17, 87: 19, 88: 26, 89: 30, 90: 20, 91: 15, 92: 21,
    93: 11, 94: 8, 95: 8, 96: 19, 97: 5, 98: 8, 99: 8,
    100: 11, 101: 11, 102: 8, 103: 3, 104: 9, 105: 5, 106: 4,
    107: 7, 108: 3, 109: 6, 110: 3, 111: 5, 112: 4, 113: 5, 114: 6,
}


# ---------------------------------------------------------------------------
# Text normalisation
# ---------------------------------------------------------------------------
_PUNCT = re.compile(r"[^\w\s]", re.UNICODE)

def normalise(text: str) -> str:
    """Lowercase, strip combining marks, collapse whitespace, remove punctuation."""
    if not text:
        return ""
    text = "".join(c for c in unicodedata.normalize("NFD", text)
                   if unicodedata.category(c)[0] != "M")
    text = text.lower()
    text = _PUNCT.sub(" ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ---------------------------------------------------------------------------
# Similarity metrics
# ---------------------------------------------------------------------------
def char_sim(a: str, b: str) -> float:
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    return difflib.SequenceMatcher(None, a, b).ratio()


def token_sim(a: str, b: str) -> float:
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    sa = set(a.split())
    sb = set(b.split())
    union = len(sa | sb)
    return len(sa & sb) / union if union else 0.0


# ---------------------------------------------------------------------------
# HTTP helper
# ---------------------------------------------------------------------------
def _get(url: str, retries: int = 3) -> dict:
    for attempt in range(retries):
        try:
            req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urlopen(req, timeout=30) as r:
                return json.loads(r.read())
        except HTTPError as e:
            if e.code == 429:
                wait = 2 ** (attempt + 1)
                print(f"\n    Rate limited — sleeping {wait}s …")
                time.sleep(wait)
            else:
                raise
        except URLError:
            if attempt < retries - 1:
                time.sleep(1)
            else:
                raise
    raise RuntimeError(f"Failed after {retries} attempts: {url}")


# ---------------------------------------------------------------------------
# Source 1: alquran.cloud  en.transliteration  (114 surah requests)
# ---------------------------------------------------------------------------
def fetch_alqurancloud() -> dict:
    """Returns {(surah_id, verse_num): text}"""
    print("Fetching ref1: alquran.cloud en.transliteration (114 surahs) …")
    ref = {}
    for sid in range(1, 115):
        url = f"https://api.alquran.cloud/v1/surah/{sid}/en.transliteration"
        data = _get(url)
        if data.get("code") != 200:
            print(f"\n  WARNING: surah {sid} returned code {data.get('code')}")
            continue
        for aya in data["data"].get("ayahs", []):
            vid = aya["numberInSurah"]
            ref[(sid, vid)] = aya.get("text", "")
        print(f"  {sid}/114 — {len(ref):,} verses", end="\r")
        time.sleep(DELAY)
    print(f"\n  Done — {len(ref):,} verses in ref1")
    return ref


# ---------------------------------------------------------------------------
# Source 2: Quran.com translations/57  (bulk, sequential — no verse_key)
# ---------------------------------------------------------------------------
def fetch_qurancom57() -> dict:
    """Returns {(surah_id, verse_num): text}"""
    print("Fetching ref2: Quran.com translations/57 …")
    url = "https://api.quran.com/api/v4/quran/translations/57"
    data = _get(url)
    raw = data.get("translations", [])
    print(f"  Received {len(raw):,} entries")

    # Map sequential position → (surah_id, verse_num)
    ref = {}
    idx = 0
    for sid in range(1, 115):
        for vid in range(1, VERSE_COUNTS[sid] + 1):
            if idx >= len(raw):
                break
            text = re.sub(r"<[^>]+>", "", raw[idx].get("text", ""))
            ref[(sid, vid)] = text
            idx += 1

    print(f"  Mapped {len(ref):,} verses to (surah, verse) keys")
    return ref


# ---------------------------------------------------------------------------
# Load local CSV
# ---------------------------------------------------------------------------
def load_local() -> list:
    rows = []
    with open(LOCAL_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    print(f"Loaded {len(rows):,} local verses from {LOCAL_CSV}")
    return rows


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    local_rows = load_local()
    ref1 = fetch_alqurancloud()
    ref2 = fetch_qurancom57()

    if len(ref1) < 6000:
        sys.exit(f"ERROR: ref1 only returned {len(ref1)} verses — aborting.")
    if len(ref2) < 6000:
        print(f"WARNING: ref2 only returned {len(ref2)} verses — results may be incomplete.")

    results = []
    flagged_by_surah = {}
    total_by_surah   = {}

    print("\nComputing similarity scores …")
    for i, row in enumerate(local_rows):
        sid = int(row["surah_id"])
        vid = int(row["verse_number"])
        local_raw = row.get("transliteration", "")

        r1_raw = ref1.get((sid, vid), "")
        r2_raw = ref2.get((sid, vid), "")

        loc_n = normalise(local_raw)
        r1_n  = normalise(r1_raw)
        r2_n  = normalise(r2_raw)

        cs1 = round(char_sim(loc_n, r1_n),  4)
        cs2 = round(char_sim(loc_n, r2_n),  4)
        ts1 = round(token_sim(loc_n, r1_n), 4)
        ts2 = round(token_sim(loc_n, r2_n), 4)

        flagged = (cs1 < CHAR_SIM_THRESHOLD and ts1 < TOKEN_SIM_THRESHOLD and
                   cs2 < CHAR_SIM_THRESHOLD and ts2 < TOKEN_SIM_THRESHOLD)

        results.append({
            "surah_id":              sid,
            "verse_number":          vid,
            "local_transliteration": local_raw,
            "ref1_transliteration":  r1_raw,
            "ref2_transliteration":  r2_raw,
            "char_similarity_ref1":  cs1,
            "char_similarity_ref2":  cs2,
            "token_similarity_ref1": ts1,
            "token_similarity_ref2": ts2,
            "flagged":               "Y" if flagged else "N",
        })

        total_by_surah[sid]   = total_by_surah.get(sid, 0) + 1
        if flagged:
            flagged_by_surah[sid] = flagged_by_surah.get(sid, 0) + 1

        if (i + 1) % 500 == 0:
            print(f"  {i+1:,}/{len(local_rows):,} verses processed …")

    # ------------------------------------------------------------------
    # Write report
    # ------------------------------------------------------------------
    fieldnames = [
        "surah_id", "verse_number",
        "local_transliteration", "ref1_transliteration", "ref2_transliteration",
        "char_similarity_ref1", "char_similarity_ref2",
        "token_similarity_ref1", "token_similarity_ref2",
        "flagged",
    ]
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
    print(f"\nReport written to: {OUTPUT_CSV}")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    total    = len(results)
    n_flag   = sum(1 for r in results if r["flagged"] == "Y")
    n_ok     = total - n_flag
    flag_pct = n_flag / total * 100 if total else 0

    print("\n" + "=" * 65)
    print("TRANSLITERATION VERIFICATION SUMMARY")
    print("=" * 65)
    print(f"Total verses checked : {total:,}")
    print(f"OK (not flagged)     : {n_ok:,}  ({100 - flag_pct:.1f}%)")
    print(f"Flagged (suspect)    : {n_flag:,}  ({flag_pct:.1f}%)")

    if flag_pct <= 5:
        print("→ Within expected range (≤5%). Likely style differences only.")
    elif flag_pct <= 10:
        print("→ Elevated rate (5–10%). Spot-check recommended.")
    else:
        print("→ HIGH flagged rate (>10%). Possible systematic data quality issue.")

    # Top 20 flagged by lowest combined similarity
    flagged_rows = [r for r in results if r["flagged"] == "Y"]
    flagged_rows.sort(key=lambda r: (
        r["char_similarity_ref1"] + r["char_similarity_ref2"] +
        r["token_similarity_ref1"] + r["token_similarity_ref2"]
    ))

    if flagged_rows:
        print(f"\nTop 20 flagged verses (lowest combined similarity):")
        hdr = f"  {'S:V':<10}  {'csR1':>6}  {'csR2':>6}  {'tsR1':>6}  {'tsR2':>6}  Local transliteration"
        print(hdr)
        print("  " + "-" * (len(hdr) - 2))
        for r in flagged_rows[:20]:
            loc_preview = r["local_transliteration"][:55]
            print(f"  {r['surah_id']}:{r['verse_number']:<7}  "
                  f"{r['char_similarity_ref1']:>6.3f}  {r['char_similarity_ref2']:>6.3f}  "
                  f"{r['token_similarity_ref1']:>6.3f}  {r['token_similarity_ref2']:>6.3f}  "
                  f"{loc_preview}")

    # Surahs with >10% flagged
    problem_surahs = [
        (sid, flagged_by_surah[sid], total_by_surah[sid],
         flagged_by_surah[sid] / total_by_surah[sid] * 100)
        for sid in flagged_by_surah
        if flagged_by_surah[sid] / total_by_surah[sid] > 0.10
    ]
    problem_surahs.sort(key=lambda x: -x[3])

    if problem_surahs:
        print(f"\nSurahs with >10% flagged verses (systematic issues):")
        print(f"  {'Surah':>6}  {'Flagged':>8}  {'Total':>7}  {'Rate':>6}")
        print(f"  {'-'*6}  {'-'*8}  {'-'*7}  {'-'*6}")
        for sid, nf, nt, pct in problem_surahs:
            print(f"  {sid:>6}  {nf:>8}  {nt:>7}  {pct:>5.1f}%")
    else:
        print("\nNo surah exceeds 10% flagged rate.")

    print("=" * 65)


if __name__ == "__main__":
    main()
