# BRIEF — xmail explainer

workflow: product-launch-video
flow: autonomous
mode: autonomous
status: confirmed

## Intent

A 1:1 structural replica of a supplied SaaS-explainer template ("Workly" by
Solair, 27.5s, 1080p), reworded for xmail and recolored to xmail's design
system. The template is the spec: every beat, its order, its motion and its
composition are reproduced. Only the copy and the palette change.

- **message:** xmail is email addressed to a wallet — encrypted in your
  browser, sent wallet-to-wallet on Solana, with the chain holding the
  recipient's key so nobody can impersonate them.
- **angle:** the spam/spoofing problem, then the wallet-native answer. Taken
  from the site's own positioning (`src/components/site/Hero.tsx`).
- **length:** 28.5s (template is 27.5s).
- **destination:** 16:9, 1920x1080.
- **capture:** no-capture. UI is rebuilt in HTML from the product's own
  components and copy, not screenshotted.

## Source template beat map (replicated exactly)

| # | Template beat | xmail rewording |
|---|---|---|
| 1 | Chat pills fly in and stack, rotated, chaos | Spam / phishing subject-line pills |
| 2 | "Can't keep up?" bold black centered | "Who actually sent that?" |
| 3 | "Meet your new AI workspace", accent on tail words | "Meet wallet-to-wallet email" |
| 4 | Folder + cards + cursor, drops into a tilted app window drop-zone | Envelope + message cards + lock, drops into the xmail inbox |
| 5 | "Business analytics" types in, dashboard slides up beneath | "Verified on-chain", xmail inbox slides up |
| 6 | Phone floating in ribbons, chatbot reply appears | Phone with an xmail thread, verified encrypted reply |
| 7 | "Chat / With our / AI Bot", 3 cascading indented lines | "Only / They Can / Read It" |
| 8 | "No more chaos." mixed-color words, drifting circle outlines | "No more spoofing." |
| 9 | Notification toasts drift in over a blurred dashboard | xmail toasts (verified, key registered, decrypted, delivered) |
| 10| "Workly" logo scale-in + tagline | xmail wordmark + "Email, addressed to a wallet." |

## Recolor map (template -> xmail)

Source of truth: `E:\New Claude\xmail\src\index.css`.

| Template | xmail token | Value |
|---|---|---|
| warm white ground `#EFEFEF` / `#FDFDFB` | `--background` | `#FDFCFB` |
| panel grey | `--surface-sunken` | `#F7F5F1` |
| saturated blue `#2563F0` / `#1E3AE0` | `--primary` (ink) | `#131318` |
| cyan accent dot `#4DBEF5` | `--verified` | `#487A68` |
| light blue tail text | verified bright | `#55A088` |
| logo blue | ink + verified dot | `#131318` / `#487A68` |

Narrative logic for the recolor: the chaos beats are monochrome ink-on-paper;
the verified green only enters once xmail does, and carries the one claim the
product exists to make. This is the design system's own rule ("one accent,
used sparingly").

Type: Space Grotesk (display), Inter (UI), JetBrains Mono (addresses) — the
project's own `tailwind.config.ts` stack.

## Customizations

- No voice-over, no music bed. The template is silent motion graphics.
- Product UI is rebuilt in HTML using the real inbox data from
  `src/components/site/Hero.tsx` and the real wordmark geometry from
  `src/components/site/Wordmark.tsx`.
