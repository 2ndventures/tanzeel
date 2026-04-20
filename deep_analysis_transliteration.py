#!/usr/bin/env python3
"""
Deep-analysis pass on flagged transliteration verses in surahs 2, 5, 48, 60, 65.
Separates style differences from genuine content errors using aggressive normalisation.
"""
import csv
import difflib
import re
import unicodedata

REPORT_CSV  = "transliteration_verification_report.csv"
VERSES_CSV  = "verses_export.csv"
OUTPUT_CSV  = "flagged_deep_analysis.csv"

TARGET_SURAHS = {2, 5, 48, 60, 65}
STYLE_THRESH  = 0.85   # style-norm sim above this → STYLE_ONLY
ERROR_THRESH  = 0.60   # style-norm sim below this → REAL_ERROR

# ---------------------------------------------------------------------------
# Normalisation helpers
# ---------------------------------------------------------------------------
_NON_ALNUM = re.compile(r"[^a-z0-9\s]")

def style_norm(text: str) -> str:
    """
    Strip ALL combining marks (U+0300-U+036F Latin + U+0653-U+065F Arabic),
    lowercase, strip non-alphanumeric, collapse whitespace.
    """
    if not text:
        return ""
    # NFD decompose so combining marks become separate code points
    nfd = unicodedata.normalize("NFD", text)
    # Drop every combining mark in the two ranges
    stripped = "".join(
        c for c in nfd
        if not (0x0300 <= ord(c) <= 0x036F or 0x0653 <= ord(c) <= 0x065F)
    )
    stripped = stripped.lower()
    stripped = _NON_ALNUM.sub(" ", stripped)
    stripped = re.sub(r"\s+", " ", stripped).strip()
    return stripped


def char_sim(a: str, b: str) -> float:
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    return difflib.SequenceMatcher(None, a, b).ratio()


# ---------------------------------------------------------------------------
# Load data
# ---------------------------------------------------------------------------
def load_report() -> list[dict]:
    rows = []
    with open(REPORT_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            rows.append(row)
    return rows


def load_arabic() -> dict:
    """Returns {(surah_id, verse_number): arabic_text}"""
    arabic = {}
    with open(VERSES_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            arabic[(int(row["surah_id"]), int(row["verse_number"]))] = row["arabic_text"]
    return arabic


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    report  = load_report()
    arabic  = load_arabic()

    flagged_target = [
        r for r in report
        if r["flagged"] == "Y" and int(r["surah_id"]) in TARGET_SURAHS
    ]
    print(f"Flagged verses in surahs {sorted(TARGET_SURAHS)}: {len(flagged_target)}")

    results = []
    counts  = {}   # {surah_id: {classification: count}}

    for r in flagged_target:
        sid = int(r["surah_id"])
        vid = int(r["verse_number"])

        local = r["local_transliteration"]
        ref1  = r["ref1_transliteration"]
        ref2  = r["ref2_transliteration"]

        # Raw best similarity (max of char sim against both refs, from original report)
        raw_sim = max(float(r["char_similarity_ref1"]), float(r["char_similarity_ref2"]))

        # Style-normalised similarity
        sn_local = style_norm(local)
        sn_r1    = style_norm(ref1)
        sn_r2    = style_norm(ref2)

        sn_sim_r1 = char_sim(sn_local, sn_r1)
        sn_sim_r2 = char_sim(sn_local, sn_r2)
        sn_sim    = max(sn_sim_r1, sn_sim_r2)   # best against either ref

        if sn_sim > STYLE_THRESH:
            classification = "STYLE_ONLY"
        elif sn_sim < ERROR_THRESH:
            classification = "REAL_ERROR"
        else:
            classification = "BORDERLINE"

        counts.setdefault(sid, {"STYLE_ONLY": 0, "BORDERLINE": 0, "REAL_ERROR": 0})
        counts[sid][classification] += 1

        results.append({
            "surah":                    sid,
            "verse":                    vid,
            "local":                    local,
            "ref1":                     ref1,
            "ref2":                     ref2,
            "arabic":                   arabic.get((sid, vid), ""),
            "raw_best_similarity":      round(raw_sim,  4),
            "sn_sim_ref1":              round(sn_sim_r1, 4),
            "sn_sim_ref2":              round(sn_sim_r2, 4),
            "style_normalized_similarity": round(sn_sim, 4),
            "classification":           classification,
        })

    # ------------------------------------------------------------------
    # Write CSV
    # ------------------------------------------------------------------
    fieldnames = [
        "surah", "verse", "local", "ref1", "ref2", "arabic",
        "raw_best_similarity", "sn_sim_ref1", "sn_sim_ref2",
        "style_normalized_similarity", "classification",
    ]
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
    print(f"Report written to: {OUTPUT_CSV}\n")

    # ------------------------------------------------------------------
    # Summary by surah
    # ------------------------------------------------------------------
    print("=" * 65)
    print("CLASSIFICATION BREAKDOWN BY SURAH")
    print("=" * 65)
    print(f"  {'Surah':>6}  {'STYLE_ONLY':>11}  {'BORDERLINE':>11}  {'REAL_ERROR':>11}  {'Total':>6}")
    print(f"  {'-'*6}  {'-'*11}  {'-'*11}  {'-'*11}  {'-'*6}")
    totals = {"STYLE_ONLY": 0, "BORDERLINE": 0, "REAL_ERROR": 0}
    for sid in sorted(counts):
        c = counts[sid]
        total = sum(c.values())
        print(f"  {sid:>6}  {c['STYLE_ONLY']:>11}  {c['BORDERLINE']:>11}  {c['REAL_ERROR']:>11}  {total:>6}")
        for k in totals:
            totals[k] += c[k]
    grand = sum(totals.values())
    print(f"  {'TOTAL':>6}  {totals['STYLE_ONLY']:>11}  {totals['BORDERLINE']:>11}  {totals['REAL_ERROR']:>11}  {grand:>6}")
    print()

    # ------------------------------------------------------------------
    # 10 worst REAL_ERROR rows
    # ------------------------------------------------------------------
    real_errors = [r for r in results if r["classification"] == "REAL_ERROR"]
    real_errors.sort(key=lambda x: x["style_normalized_similarity"])

    print("=" * 65)
    print(f"10 WORST REAL_ERROR VERSES  (lowest style-normalised similarity)")
    print("=" * 65)
    for r in real_errors[:10]:
        print(f"\n  ── Surah {r['surah']}:{r['verse']}  "
              f"(sn_sim={r['style_normalized_similarity']:.3f}  raw={r['raw_best_similarity']:.3f}) ──")
        print(f"  Arabic : {r['arabic']}")
        print(f"  Local  : {r['local']}")
        print(f"  Ref1   : {r['ref1']}")
        print(f"  Ref2   : {r['ref2']}")

    # ------------------------------------------------------------------
    # Specific verses: 10:27 and 2:257
    # ------------------------------------------------------------------
    print("\n" + "=" * 65)
    print("SPECIFIC VERSES: 10:27 and 2:257")
    print("=" * 65)

    for target_sid, target_vid in [(10, 27), (2, 257)]:
        # These may or may not be in our target surahs — look in full report
        row = next(
            (r for r in report
             if int(r["surah_id"]) == target_sid and int(r["verse_number"]) == target_vid),
            None
        )
        if not row:
            print(f"\n  {target_sid}:{target_vid} — not found in report")
            continue

        local = row["local_transliteration"]
        ref1  = row["ref1_transliteration"]
        ref2  = row["ref2_transliteration"]
        ar    = arabic.get((target_sid, target_vid), "")

        sn_local = style_norm(local)
        sn_r1    = style_norm(ref1)
        sn_r2    = style_norm(ref2)
        sn_r1s   = char_sim(sn_local, sn_r1)
        sn_r2s   = char_sim(sn_local, sn_r2)
        sn_best  = max(sn_r1s, sn_r2s)
        raw_best = max(float(row["char_similarity_ref1"]), float(row["char_similarity_ref2"]))

        if sn_best > STYLE_THRESH:
            cls = "STYLE_ONLY"
        elif sn_best < ERROR_THRESH:
            cls = "REAL_ERROR"
        else:
            cls = "BORDERLINE"

        print(f"\n  ── {target_sid}:{target_vid}  flagged={row['flagged']}  "
              f"raw_best={raw_best:.3f}  sn_best={sn_best:.3f}  → {cls} ──")
        print(f"  Arabic : {ar}")
        print(f"  Local  : {local}")
        print(f"  Ref1   : {ref1}")
        print(f"  Ref2   : {ref2}")
        print(f"  Style-norm local : {sn_local[:80]}")
        print(f"  Style-norm ref1  : {sn_r1[:80]}")
        print(f"  Style-norm ref2  : {sn_r2[:80]}")
        print(f"  sn_sim_ref1={sn_r1s:.3f}  sn_sim_ref2={sn_r2s:.3f}")

    print("\n" + "=" * 65)


if __name__ == "__main__":
    main()
