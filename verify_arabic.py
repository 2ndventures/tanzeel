#!/usr/bin/env python3
"""
Verify local arabic_text against Tanzil Uthmani reference.
Falls back to Quran.com API if Tanzil XML download fails.
"""
import csv
import sys
import time
import unicodedata
import xml.etree.ElementTree as ET
from urllib.request import urlopen, Request
from urllib.error import URLError

LOCAL_CSV = "verses_export.csv"
OUTPUT_CSV = "arabic_verification_report.csv"
LOCAL_XML  = "quran-uthmani.xml"

# ---------------------------------------------------------------------------
# Arabic Unicode character classification helpers
# ---------------------------------------------------------------------------
DIACRITIC_RANGE = range(0x064B, 0x065F + 1)   # fathah .. superscript alef
EXTENDED_DIAC   = {0x0610, 0x0611, 0x0612, 0x0613, 0x0614, 0x0615, 0x0616,
                   0x0617, 0x0618, 0x0619, 0x061A, 0x06D6, 0x06D7, 0x06D8,
                   0x06D9, 0x06DA, 0x06DB, 0x06DC, 0x06DF, 0x06E0, 0x06E1,
                   0x06E2, 0x06E3, 0x06E4, 0x06E7, 0x06E8, 0x06EA, 0x06EB,
                   0x06EC, 0x06ED}
TATWEEL         = 0x0640
HAMZA_VARIANTS  = {0x0621, 0x0622, 0x0623, 0x0624, 0x0625, 0x0626}
ALEF_VARIANTS   = {0x0627, 0x0622, 0x0623, 0x0625, 0x0671, 0x0672, 0x0673,
                   0x0675, 0x0676, 0x0677}
SMALL_SIGNS     = set(range(0x06D6, 0x06ED + 1))


def classify_char(cp: int) -> str:
    if cp in DIACRITIC_RANGE or cp in EXTENDED_DIAC:
        return "diacritic"
    if cp == TATWEEL:
        return "tatweel"
    if cp in HAMZA_VARIANTS:
        return "hamza-variant"
    if cp in ALEF_VARIANTS:
        return "alef-variant"
    if cp in SMALL_SIGNS:
        return "small-sign"
    if 0x0600 <= cp <= 0x06FF:
        return "arabic-letter"
    return "other"


def is_letter(cp: int) -> bool:
    return classify_char(cp) == "arabic-letter"


def norm(text: str) -> str:
    """NFC-normalize, strip BOM and surrounding whitespace."""
    text = text.strip().lstrip("\ufeff")
    return unicodedata.normalize("NFC", text)


def char_diff(local: str, ref: str):
    """Return (first_diff_pos, diff_codepoints_str, diff_length, has_letter_diff)."""
    max_len = max(len(local), len(ref))
    first_pos = None
    diff_details = []
    letter_diff = False

    for i in range(max_len):
        lc = local[i] if i < len(local) else None
        rc = ref[i]   if i < len(ref)   else None
        if lc != rc:
            if first_pos is None:
                first_pos = i
            if len(diff_details) < 5:
                lcp = f"U+{ord(lc):04X}" if lc else "∅"
                rcp = f"U+{ord(rc):04X}" if rc else "∅"
                diff_details.append(f"local={lcp} ref={rcp}")
            if lc and is_letter(ord(lc)):
                letter_diff = True
            if rc and is_letter(ord(rc)):
                letter_diff = True

    diff_len = sum(1 for i in range(max_len)
                   if (local[i] if i < len(local) else None) !=
                      (ref[i]   if i < len(ref)   else None))
    return first_pos, "; ".join(diff_details), diff_len, letter_diff


# ---------------------------------------------------------------------------
# Source 1: Tanzil XML
# ---------------------------------------------------------------------------
def fetch_tanzil_xml() -> dict:
    url = ("https://tanzil.net/pub/download/index.php"
           "?quranType=uthmani&outType=xml-tanzil&agree=true")
    print("Trying Tanzil XML download …")
    try:
        req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=30) as r:
            raw = r.read()
        print(f"  Downloaded {len(raw):,} bytes from Tanzil")
        root = ET.fromstring(raw)
        # <quran> → <sura index="1"> → <aya index="1" text="…"/>
        ref = {}
        for sura in root.findall("sura"):
            sid = int(sura.attrib["index"])
            for aya in sura.findall("aya"):
                vid = int(aya.attrib["index"])
                ref[(sid, vid)] = aya.attrib["text"]
        print(f"  Parsed {len(ref):,} verses from Tanzil XML")
        return ref
    except Exception as e:
        print(f"  Tanzil XML failed: {e}")
        return {}


# ---------------------------------------------------------------------------
# Source 2: Quran.com API (paginated, 50 per page)
# ---------------------------------------------------------------------------
def fetch_qurancom_api() -> dict:
    import json
    print("Falling back to Quran.com API …")
    ref = {}
    page = 1
    while True:
        url = (f"https://api.quran.com/api/v4/quran/verses/uthmani"
               f"?page={page}&per_page=50")
        try:
            req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urlopen(req, timeout=20) as r:
                data = json.loads(r.read())
        except Exception as e:
            print(f"  API page {page} failed: {e}")
            break

        verses = data.get("verses", [])
        if not verses:
            break
        for v in verses:
            key = v["verse_key"]          # "2:3"
            sid, vid = map(int, key.split(":"))
            ref[(sid, vid)] = v["text_uthmani"]

        meta = data.get("meta", {})
        total_pages = meta.get("total_pages", 1)
        print(f"  Page {page}/{total_pages} — {len(ref):,} verses so far", end="\r")
        if page >= total_pages:
            break
        page += 1
        time.sleep(0.1)

    print(f"\n  Parsed {len(ref):,} verses from Quran.com API")
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
def load_local_xml(path: str) -> dict:
    """Parse a locally saved Tanzil XML file."""
    print(f"Loading local Tanzil XML from {path} …")
    tree = ET.parse(path)
    root = tree.getroot()
    ref = {}
    for sura in root.findall("sura"):
        sid = int(sura.attrib["index"])
        for aya in sura.findall("aya"):
            vid = int(aya.attrib["index"])
            ref[(sid, vid)] = aya.attrib["text"]
    print(f"  Parsed {len(ref):,} verses from local XML")
    return ref


def main():
    local_rows = load_local()

    import os
    if os.path.exists(LOCAL_XML):
        ref = load_local_xml(LOCAL_XML)
    else:
        ref = fetch_tanzil_xml()
    if len(ref) < 6000:
        ref = fetch_qurancom_api()
    if len(ref) < 6000:
        sys.exit("ERROR: Could not obtain reference text (fewer than 6000 verses). Aborting.")

    results = []
    mismatch_by_surah = {}
    pattern_counts = {}
    urgent_mismatches = []   # letter-level diffs

    for row in local_rows:
        sid = int(row["surah_id"])
        vid = int(row["verse_number"])
        local_raw = row["arabic_text"]

        local_n = norm(local_raw)
        ref_text = ref.get((sid, vid), "")
        ref_n    = norm(ref_text)

        if local_n == ref_n:
            results.append({
                "surah_id": sid, "verse_number": vid,
                "match": "Y",
                "local_text": local_raw, "reference_text": ref_text,
                "first_diff_position": "", "diff_codepoints": "", "diff_length": "",
            })
        else:
            first_pos, diff_cp, diff_len, has_letter = char_diff(local_n, ref_n)
            results.append({
                "surah_id": sid, "verse_number": vid,
                "match": "N",
                "local_text": local_raw, "reference_text": ref_text,
                "first_diff_position": first_pos,
                "diff_codepoints": diff_cp,
                "diff_length": diff_len,
            })
            mismatch_by_surah[sid] = mismatch_by_surah.get(sid, 0) + 1

            # Classify the differing characters for pattern analysis
            for tok in diff_cp.split("; "):
                for part in tok.split(" "):
                    if part.startswith("local=") or part.startswith("ref="):
                        cp_str = part.split("=")[1]
                        if cp_str != "∅" and cp_str.startswith("U+"):
                            cp = int(cp_str[2:], 16)
                            cat = classify_char(cp)
                            pattern_counts[cat] = pattern_counts.get(cat, 0) + 1

            if has_letter:
                urgent_mismatches.append((sid, vid, diff_cp, local_n, ref_n))

    # Write report CSV
    fieldnames = ["surah_id", "verse_number", "match", "local_text",
                  "reference_text", "first_diff_position", "diff_codepoints", "diff_length"]
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(results)
    print(f"\nReport written to: {OUTPUT_CSV}")

    # -----------------------------------------------------------------------
    # Summary
    # -----------------------------------------------------------------------
    total        = len(results)
    n_match      = sum(1 for r in results if r["match"] == "Y")
    n_mismatch   = total - n_match

    print("\n" + "=" * 60)
    print("ARABIC TEXT VERIFICATION SUMMARY")
    print("=" * 60)
    print(f"Total verses checked       : {total:,}")
    print(f"Matching exactly (post-NFC): {n_match:,}  ({n_match/total*100:.1f}%)")
    print(f"Verses with differences    : {n_mismatch:,}  ({n_mismatch/total*100:.1f}%)")

    if mismatch_by_surah:
        top10 = sorted(mismatch_by_surah.items(), key=lambda x: -x[1])[:10]
        print("\nTop 10 surahs with most mismatches:")
        for sid, cnt in top10:
            print(f"  Surah {sid:>3}: {cnt} mismatches")

    if pattern_counts:
        print("\nDiff character-type breakdown (across all mismatches):")
        for cat, cnt in sorted(pattern_counts.items(), key=lambda x: -x[1]):
            print(f"  {cat:<20}: {cnt}")

    print("\n" + "=" * 60)
    if urgent_mismatches:
        print(f"URGENT — {len(urgent_mismatches)} verse(s) differ at LETTER level (not just diacritics):")
        for sid, vid, diff_cp, local_n, ref_n in urgent_mismatches[:20]:
            print(f"  Surah {sid}:{vid}")
            print(f"    local : {local_n[:80]}")
            print(f"    ref   : {ref_n[:80]}")
            print(f"    diff  : {diff_cp}")
    else:
        print("No letter-level mismatches found. All differences are diacritics/signs only.")
    print("=" * 60)


if __name__ == "__main__":
    main()
