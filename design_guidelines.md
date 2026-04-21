# Tanzeel — Brand & Design Guidelines

> **Tanzeel is the Mushaf in the light it was meant to be read in.**
>
> Dark mode is *fajr candlelight*. Light mode is *duha sunlit parchment*.
> Same hues. Different lightness. The same book, two times of day.

---

## 1. Brand thesis

Tanzeel is not a "Quran app." It is a **Mushaf** — a calm, reverent surface
the reader visits to *be with* the words. Every design decision should answer
one question:

> *Does this make the page feel like a Mushaf, or does it make it feel like an app?*

Things that make it feel like a Mushaf: cream parchment, antique gold, deep
navy ink, restrained voice, a single warm halo around the active word, slow
fades. Things that make it feel like an app: bouncy easing, neon gradients,
chatty empty states, decorative drop shadows, pure white.

---

## 2. Color system

All semantic colors are defined in `client/src/index.css` as HSL token
triplets (no `hsl()` wrapper, no `#` literals). Tailwind reads them through
the `tailwind.config.ts` mapping.

**Never hardcode hex values in components.** Use the semantic tokens
(`bg-background`, `text-foreground`, `text-primary`, `bg-card`, `border-border`,
`text-destructive`, etc.) or the glow tokens (`hsl(var(--glow-primary))`) for
the active-word halo.

### Dark mode — *fajr candlelight* (canonical)

| Token              | HSL              | Role                                  |
| ------------------ | ---------------- | ------------------------------------- |
| `--background`     | `217 44% 11%`    | Deep night-navy surface               |
| `--foreground`     | `0 0% 100%`      | Bone-white text                       |
| `--card`           | `220 28% 17%`    | Slightly lifted panel                 |
| `--primary`        | `45 93% 58%`     | Warm gold (verse numbers, CTAs)       |
| `--secondary`      | `32 95% 52%`     | Saffron orange                        |
| `--accent`         | `28 80% 45%`     | Burnt amber                           |
| `--destructive`    | `0 84% 60%`      | Restrained red (used sparingly)       |
| `--glow-primary`   | `45 93% 58%`     | Active-word halo (gold candlelight)   |

### Light mode — *duha sunlit parchment*

The **same hues** at lower lightness. Cream surface, navy ink, antique gold.

| Token              | HSL              | Hex        | Role                                  |
| ------------------ | ---------------- | ---------- | ------------------------------------- |
| `--background`     | `41 67% 93%`     | `#F8F2E4`  | Warm cream parchment                  |
| `--foreground`     | `215 48% 11%`    | `#0F1A2A`  | Deep navy ink                         |
| `--card`           | `41 50% 90%`     | —          | Slightly elevated cream               |
| `--border`         | `38 30% 80%`     | —          | Warm parchment edge                   |
| `--primary`        | `43 88% 38%`     | `#B8860B`  | Antique gold (same hue family as dark) |
| `--secondary`      | `25 80% 27%`     | `#7C3F0F`  | Walnut                                |
| `--accent`         | `22 72% 37%`     | `#A0531A`  | Burnt sienna                          |
| `--destructive`    | `8 60% 41%`      | `#A8392A`  | Sealing-wax red                       |
| `--glow-primary`   | `33 95% 50%`     | —          | Warm halo (candlelight on parchment)  |

**Why this works:** primary stays in the gold/amber family across both modes
(43° / 45° hue, just different L). When the user toggles theme, the brand
identity does not break — it just changes its lighting.

---

## 3. Typography

Three families, three jobs.

| Family                           | CSS var          | Usage                                                |
| -------------------------------- | ---------------- | ---------------------------------------------------- |
| **EB Garamond**                  | `--font-heading` | Headings, page titles, "Tanzeel" wordmark, brand voice |
| System UI sans                   | `--font-sans`    | Body, labels, controls, metadata                      |
| **Scheherazade New** / Amiri     | `--font-arabic`  | Arabic verse text (uthmani)                           |
| **Noto Nastaliq Urdu**           | `--font-indopak` | IndoPak Arabic script                                 |

Use the `font-heading` Tailwind class for any title, page H1, hero label, or
the wordmark. EB Garamond gives Tanzeel a quiet, classical book-front feel
that pure sans cannot.

```tsx
<h1 className="font-heading text-5xl font-black tracking-tighter text-foreground">
  Tanzeel
</h1>
```

---

## 4. The signature moment: the active word

When recitation is playing, the currently spoken Arabic word is wrapped in
the `.active-word` class. It receives:

- `color: hsl(var(--glow-primary))` — warm gold
- `font-weight: 700`
- In light mode: a soft 12px text-shadow at 40% alpha

This is the **atomic brand image**. Anywhere we need a brand mark — the
favicon, the splash, a loading state, marketing — the gold-haloed Arabic
word *is* the logo. Treat it as inviolable.

The `--glow-primary` token is what the dev-only `WordColorTuner` writes to
when calibrating. The locked-in default is `33 95% 50%`.

---

## 5. The verse-end ornament

Every verse ends with a circular ornament containing the verse number in
Arabic-Indic numerals (`.verse-end-ornament`, with a tajweed variant). It
borrows its border and color from `--glow-primary` and is the **second
brand mark** — a small, unmistakable Mushaf cue. Reuse it for:

- Section dividers between major UI groups
- The favicon and splash artwork
- Loading-state rosettes (replace generic spinners where calm is wanted)

---

## 6. Voice

Tanzeel does not chatter. Empty and error states should read like a quiet
note in the margin of a book, not like a chatbot.

| Avoid                                  | Prefer                                                |
| -------------------------------------- | ----------------------------------------------------- |
| "No bookmarks yet"                     | "The page is unmarked"                                |
| "Something went wrong, please retry!"  | "We couldn't reach the recitation. Try again."        |
| "🎉 Welcome back!"                     | "As-salamu alaykum"                                   |
| "Loading..."                           | (use the verse-end ornament rosette, no text)        |

No emojis. No exclamation marks except inside actual Quranic translation.

---

## 7. Layout & motion

- **Spacing**: Tailwind 2 / 3 / 4 / 6 / 8. Card padding `p-4`–`p-6`, section
  gaps `gap-4`–`gap-6`, screen margins `px-4`–`px-6`.
- **Border radius**: `rounded-md` for utility, `rounded-2xl`/`rounded-3xl`
  for hero cards. Never one-sided borders on rounded elements.
- **Motion**: 150–300ms ease-out. **No bouncy/spring easing.** No layout
  shifts on hover. Use `hover-elevate` / `active-elevate-2` utilities; never
  hand-roll hover background colors.
- **Drop shadows**: subtle and only when an element needs to "float"
  (modals, mini-player, the recitation halo). Never decorative.

---

## 8. Component rules

- Use Shadcn primitives (`Button`, `Card`, `Badge`, `Sidebar`) — never
  reimplement.
- `<Button>` and `<Badge>` already have hover/active interactions. Never
  add `hover:bg-*` to them.
- Profile/recitor avatars use Shadcn `Avatar` + `AvatarFallback`.
- Bottom navigation on every main screen; persistent mini-player when audio
  is playing.

---

## 9. Mobile-first

- Full viewport, safe-area aware (notches, home indicator).
- 44px minimum touch targets.
- Single-column portrait layouts.
- Adaptive Arabic text sizing (S / M / L / XL controls in onboarding and
  Settings).

---

## 10. What this app is not

- It is not a feed. There is no infinite scroll of social content.
- It is not gamified. Streaks exist, but quietly — no confetti, no badges
  with neon gradients.
- It is not a brand-led product. The Quran is the product. Tanzeel is the
  *binding* around it.
