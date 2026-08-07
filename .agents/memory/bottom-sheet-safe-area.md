---
name: Bottom sheet / drawer safe-area for App Store
description: How to make bottom popups (vaul Drawer, Radix Sheet bottom variant) clear the iPhone home indicator without double-padding
---

# Bottom popups must reserve home-indicator space

Bottom sheets/drawers sit at `bottom-0`, so on notched iPhones their bottom
content/controls fall under the home indicator (~34px). Add
`env(safe-area-inset-bottom, 0px)` to the bottom padding of the scrollable /
content layer.

**Rule:** add the safe-area inset in exactly ONE layer. Do not stack it on a
container that already has a base bottom pad of its own.

**Why:** `ui/sheet.tsx` SheetContent already applies `p-6` (1.5rem all sides,
incl. bottom). Adding `calc(1.5rem + env(...))` to the inner scroll container on
top of that produced ~3rem + safe of bottom gap — too much. The Options sheet
inner scroll container should use just `env(safe-area-inset-bottom, 0px)` and
rely on SheetContent's p-6 for the base.

**How to apply:**
- Radix Sheet (`side="bottom"`): inner scroll div `style={{ paddingBottom:
  'env(safe-area-inset-bottom, 0px)' }}` (p-6 from SheetContent is the base).
- vaul Drawer: DrawerContent has no base bottom pad, so the content wrapper
  carries the whole value, e.g. `calc(2rem + env(safe-area-inset-bottom, 0px))`.
- App also has reusable utilities in `client/src/index.css`
  (`.safe-area-bottom`, `.pb-nav-clearance`, `.header-safe-padding`) using
  constant()+env() with 0px fallback.

**Keyboard overlap:** iOS uses Keyboard.resize 'none', so the WebView never
shrinks and bottom sheets with inputs get covered by the keyboard. Use
`useKeyboardHeight()` (client/src/hooks/useKeyboardHeight.ts — native
keyboardWillShow on iOS, visualViewport fallback elsewhere) and set the sheet's
inline `bottom: keyboardHeight` plus a maxHeight cap. Android (adjustResize)
and web report ~0, so no double-shift.

**Other popup App-Store nits:** keep close/back controls >= 44px (size-11, not
size-10); give Radix/vaul popups an sr-only Sheet/DrawerDescription to satisfy
the missing-description a11y warning. Do NOT enlarge tightly-spaced (~16px)
carousel pagination dots — their hit areas would overlap; rely on swipe + card
taps instead.
