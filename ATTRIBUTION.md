# Attribution

Tanzeel is a free Quran reading and listening app. Its content — the sacred text, translations, audio recitations, and word-level timing data — is made possible by the generous work of the organizations and individuals listed below. This document credits each source and links to its official terms of use.

---

## 1. Arabic Quran Text

- **Script:** Uthmani (Mushaf al-Madinah)
- **Primary source:** [Quran.com API](https://api-docs.quran.com/) (verse text endpoints)
- **Upstream source:** [Tanzil Project](https://tanzil.net/) — the canonical digital Mushaf used by Quran.com and most modern Quran applications

The Tanzeel app also includes the **IndoPak** script and a **color-coded Tajweed** rendering, both derived from the same Tanzil project text data.

**Terms of use:**
- Quran.com API: <https://quran.com/about-us> and <https://api-docs.quran.com/docs/quran.com_api/quran-text>
- Tanzil terms of use: <https://tanzil.net/docs/terms_of_use>

---

## 2. English Translation

- **Translation:** *The Qur'an: English Meanings*
- **Translator:** Saheeh International
- **Distributed via:** [Quran.com translations API](https://api-docs.quran.com/docs/quran.com_api/translations)

**Terms of use:**
- Quran.com translation terms: <https://quran.com/about-us>
- Saheeh International publisher (Abul-Qasim Publishing House / Al-Muntada Al-Islami): rights reserved for the print edition; digital distribution is permitted via the Quran.com API under their stated terms

---

## 3. Audio Recitations (8 Reciters)

Tanzeel ships with eight curated reciters. Verse-by-verse audio is streamed from the public CDNs operated by [EveryAyah](https://everyayah.com/) and [QuranicAudio](https://quranicaudio.com/).

| # | Reciter | Arabic | Style | Primary CDN |
|---|---------|--------|-------|-------------|
| 1 | Mishary Rashid Alafasy | مشاري راشد العفاسي | Murattal | everyayah.com |
| 2 | Abdul Basit Abdul Samad | عبد الباسط عبد الصمد | Murattal | everyayah.com |
| 3 | Abdul Basit Abdul Samad | عبد الباسط عبد الصمد | Mujawwad | everyayah.com |
| 4 | Abdurrahmaan As-Sudais | عبد الرحمن السديس | Murattal | everyayah.com |
| 5 | Abu Bakr Ash-Shaatree | أبو بكر الشاطري | Murattal | everyayah.com |
| 6 | Ali Al-Hudhaify | علي الحذيفي | Murattal | everyayah.com |
| 7 | Hani Rifai | هاني الرفاعي | Murattal | everyayah.com |
| 8 | Akram Al-Alaqimy | أكرم العلاقمي | Murattal | everyayah.com |

QuranicAudio is referenced as a fallback / alternate source for the same recitations.

**Terms of use:**
- EveryAyah: <https://everyayah.com/data/status.php>
- QuranicAudio: <https://quranicaudio.com/about>
- Individual reciters retain copyright over their performances; the CDNs above distribute the recordings with the reciters' consent or under public-distribution licenses

---

## 4. Word-Level Timing Data

- **Source:** [Quran.com API — Recitations endpoint](https://api-docs.quran.com/docs/quran.com_api/recitations)
- **Data:** Per-word start/end timestamps used to drive the word-by-word highlight while audio plays

**Terms of use:**
- Quran.com API: <https://api-docs.quran.com/docs/quran.com_api/introduction>

---

## Acknowledgements

Tanzeel is built on the shoulders of decades of volunteer work in the digital Quran community. We gratefully acknowledge:

- **The Tanzil Project** — for producing and maintaining the verified, freely-licensed digital Quran text that underpins essentially every modern Quran app.
- **Quran.com** — for operating an open, well-documented API that exposes verses, translations, and timing data to developers worldwide.
- **Saheeh International** — for the careful, scholarly English translation that makes the meaning of the Quran accessible to millions.
- **EveryAyah.com** — for hosting verse-segmented MP3 archives of dozens of reciters and serving them at no cost to the community.
- **QuranicAudio.com** — for curating high-quality recitation collections and providing reliable streaming infrastructure.
- **The reciters** listed above — for the gift of their voices, time, and devotion in recording the Quran for the benefit of the Ummah.

May Allah reward every individual and organization whose work made this app possible.

---

## Reporting Issues

If you are a rights holder and believe your content is being used in a way that does not align with your terms, please open an issue or contact the Tanzeel team. We will respond promptly and remove or correct the attribution as needed.
