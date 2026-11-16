---
name: calimero-desktop
description:
  'Calimero Desktop hash-token SSO (access_token in window.location.hash, parseAuthCallback) is 0.x
  only; what a core 1.0 frontend uses instead. Use when a project reads a session from the URL or
  mentions Calimero Desktop sign-in.'
---

# calimero-desktop — Agent Instructions

**There is no Calimero Desktop single sign-on for core 1.0.** This skill exists so an agent that
finds the desktop's URL-hash token flow in a project (`access_token` in `window.location.hash`,
`parseAuthCallback`, `readDesktopSSO`, `MeroProvider` consuming an SSO hash) knows what it belongs
to and what a core 1.0 app does instead.

## What is true now

- **Calimero Desktop runs the 0.x node.** The desktop app (calimero-network/tauri-app, `master`,
  desktop 0.0.149) bundles and manages `merod` 0.12.0 and is built on `@calimero-network/mero-js` 26
  and `mero-react` 10: the 0.x stack of contexts, namespaces, peers and JWT auth. It does not run or
  connect to core 1.0 clusters.
- **Its SSO is 0.x auth.** When the desktop opens an app's frontend, it appends a hash with the 0.x
  node's JWTs (`node_url`, `access_token`, `refresh_token`, `expires_at`, and the app's id); on the
  page, mero-js 26's `parseAuthCallback` (through `MeroProvider`) stores them. A core 1.0 node
  issues no such tokens.
- **mero-js 27 and later removed it**: `parseAuthCallback`, `buildAuthLoginUrl`, the token stores
  and mero-auth's SSO callback are gone, with the rest of the v1 client.

## What a core 1.0 app does instead

- **People sign in with passkeys**, on the page itself, through mero-js's `CalimeroClient` (`signUp`
  / `signIn` with `browserPasskey()`); the session is a 15-minute token with a refresh token, kept
  by the app (`useSession`). Load **`calimero-client-js`**.
- **The frontend is served by the cluster** from the signed package (`{label}.{apps-domain}`, e.g.
  `https://{label}.apps.calimero.network/`). A Calimero Cloud node runs passkey ceremonies only for
  origins it knows: frontends it serves from a bundle, its own `--origins`, or an origin the
  package's manager registered (`meroctl app origins add`). A copy hosted elsewhere cannot sign
  anyone in.
- **Machines use API keys** (`cal_…`), never a token handed over in a URL.
- **On a development cluster**, `meroctl local up` lets `http://localhost:3000` and
  `http://localhost:5173` run passkey ceremonies, and `meroctl local dev` runs the frontend on
  `:5173` against it.

## If you maintain an app for the desktop's 0.x node

Stay on mero-js 26 and mero-react 10 for that build, and let `MeroProvider` consume the hash; do not
parse it yourself. Do not carry that code into a core 1.0 frontend, and do not add it to a new
project. `references/desktop-today.md` records what the desktop sends, as found in its source.

## References

- `references/desktop-today.md`: what Calimero Desktop is and sends today, and the 1.0 equivalents.

## Rules

- `rules/no-hash-tokens-on-1.0.md`: a core 1.0 frontend never reads a session from the URL.
