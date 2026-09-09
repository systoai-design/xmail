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
  browser, sent wallet-to-wallet on **Robinhood Chain**, with the chain
  holding the recipient's key so nobody can impersonate them. Sending is
  priced in **credits** (1 credit per message body, on-chain anchor
  included) — not in native currency, and not over x402.
- **angle:** the spam/spoofing problem, then the wallet-native answer. Taken
  from the site's own positioning (`src/components/site/Hero.tsx`).
- **length:** 27.96s, matched exactly to the template's own audio track.
- **destination:** 16:9, 1920x1080.
- **capture:** no-capture. UI is rebuilt in HTML from the product's own
  components and copy, not screenshotted.

## Source template beat map (replicated exactly)

| # | Template beat | xmail rewording |
|---|---|---|
| 1 | Chat pills fly in and stack, rotated, chaos | Spam / phishing subject-line pills |
| 2 | "Can't keep up?" bold black centered | "Who actually sent that?" |
| 3 | "Meet your new AI workspace", accent on tail words | "Meet xmail." |
| 4 | Folder + cards + cursor, drops into a tilted app window drop-zone | Envelope + message cards + lock, drops into the xmail inbox |
| 5 | "Business analytics" types in, dashboard slides up beneath | "Verified on-chain", xmail inbox slides up |
| 6 | Phone floating in ribbons, chatbot reply appears | Phone with an xmail thread, verified encrypted reply |
| 7 | "Chat / With our / AI Bot", 3 cascading indented lines | "Only / They Can / Read It" |
| 8 | "No more chaos." mixed-color words, drifting circle outlines | "No more spoofing." |
| 9 | Notification toasts drift in over a blurred dashboard | xmail toasts (verified, encrypted, delivered, tamper-proof) |
| 10| "Workly" logo scale-in + tagline | xmail wordmark + "Email, addressed to a wallet." |

## Recolor map (template -> xmail)

The palette is **pure black and white by direction** - no chroma anywhere.

| Template | xmail | Value |
|---|---|---|
| warm white ground `#EFEFEF` / `#FDFDFB` | paper | `#FDFCFB` |
| panel grey | sunken | `#F7F5F1` |
| saturated blue `#2563F0` / `#1E3AE0` | ink | `#131318` |
| cyan accent dot `#4DBEF5` | ink | `#131318` |
| light blue tail text | mid grey | `#78787F` |
| logo blue | ink tile, white dot | `#131318` / `#FFFFFF` |

Note for a future cut: the product's own design system *does* carry one
chromatic accent, `--verified` (a green, `158 26% 38%` in `src/index.css`),
used for on-chain verification badges across the site. The film deliberately
does not use it; all hierarchy here comes from tone.

Type: Space Grotesk (display), Inter (UI), JetBrains Mono (addresses).

## Customizations

- **Audio: the template's own track, used whole and unmodified**
  (`assets/audio/source/template-track.wav`, extracted from the supplied MP4;
  AAC stereo, 27.96s). The composition length is matched to it so the music
  resolves on the end card instead of being cut off. An earlier cut carried a
  synthesised bed plus a Kokoro voiceover; both were dropped by direction.
  That track belongs to the source template - confirm its licence before
  publishing this anywhere public.
- Product UI is rebuilt in HTML using the real inbox data from
  `src/components/site/Hero.tsx` and the real wordmark geometry from
  `src/components/site/Wordmark.tsx`.

## Product-fact check (2026-09-08)

Every claim the film makes about how xmail itself works was re-checked against
the code, not against memory. Source of truth: `src/config/chain.ts`
(`ACTIVE_CHAIN`, `isDeployed`) and `src/components/site/Pricing.tsx`
(`CREDIT_RULES`).

Corrected in this pass — both were pre-migration:

| Beat | Was | Now |
|---|---|---|
| Scene 9 "Delivered" toast | "0.001 SOL paid over x402." | "1 credit — on-chain anchor included." |
| Scene 5 inbox header | "every sender key-checked on Solana" | "…on Robinhood Chain" |

Deliberately left alone:

- Scene 1 spam pill "You've been selected for 5 SOL" and the lookalike domain
  `support@s0Iana-team.io`. These are scam mail, not statements about xmail,
  and scammers reference any chain.
- The `0x…` sender addresses are already correct: Robinhood Chain is EVM.

Open question, not changed: the film asserts "Verified on-chain" flatly, while
`isDeployed` gates every such claim in the product on both contract addresses
being present, and `ACTIVE_CHAIN` is currently the **testnet**. If this is cut
for a public audience before mainnet contracts are live, that line needs a
decision.
