---
name: calimero-sdk-js
description:
  'The gone 0.x JavaScript app SDK (@calimero-network/calimero-sdk-js, @State/@Logic, calimero-sdk
  build) and what replaces it in Calimero 1.0. Use when a project still uses it, or when asked to
  write a Calimero app in JavaScript or TypeScript.'
---

# calimero-sdk-js — Agent Instructions

**The JavaScript app SDK is gone in Calimero 1.0.** This skill exists so an agent that finds
`@calimero-network/calimero-sdk-js`, `@State` / `@Logic` decorators or `calimero-sdk build` in a
project knows what to do instead. Do not write new code against it.

## What is true now (core 1.0.0-rc.30)

- **Calimero apps are written in Rust** with core's component SDK (`calimero-sdk`) and built by
  `meroctl app build` into a `calimero:app` WebAssembly component (`wasm32-wasip2`). Load
  **`calimero-rust-sdk`**.
- **Frontends and services in TypeScript** call apps with mero-js's `CalimeroClient` and a typed
  client from `meroctl app codegen --lang ts`. Load **`calimero-client-js`** and
  **`calimero-abi-codegen`**.
- **Core ships no JavaScript SDK.** `@calimero-network/calimero-sdk-js` and
  `@calimero-network/calimero-cli-js` are 0.x packages: they compile TypeScript through QuickJS into
  a WebAssembly core module for the 0.x runtime. A core 1.0 node refuses a core module at upload,
  install and create (`400 UNSUPPORTED_BUNDLE`), and an instance left on the old engine answers
  `410 UNSUPPORTED_ENGINE`.

## What about componentize-js?

core's engine runs any component that targets the `calimero:app` WIT world, and its limits were
measured to fit componentize-js 0.23 guests (one memory, two tables, WASI 0.2.12). That is the only
JavaScript support in core: there is **no SDK, no bindings package, no build command and no
template** for it. A JavaScript component would have to implement the WIT world itself (`handle`,
state through `calimero:app/storage`, ...) and embed a `calimero:abi` custom section the node reads
its methods from, with nothing in core or meroctl to produce either. Treat it as unsupported: do not
tell a developer it works, and do not generate such a project.

## Moving a 0.x JS app

Rewrite the logic in Rust; keep the frontend in TypeScript. `references/migrating-to-rust.md` maps
each 0.x JS SDK concept to its 1.0 counterpart.

```bash
meroctl app new my-app && cd my-app      # apps/kv-store: a Rust contract (logic/) and a React frontend (app/)
meroctl local dev apps/kv-store          # cluster, build, frontend on :5173, rebuild on save
```

## References

- `references/migrating-to-rust.md`: 0.x JS SDK concepts and their core 1.0 equivalents.

## Rules

- `rules/no-js-app-sdk.md`: do not write app logic with the 0.x JS SDK.
