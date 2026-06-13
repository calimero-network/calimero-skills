# Aliases (context / application / context-identity)

Human-readable names for the long IDs you'd otherwise hardcode. Three scopes, all on
`AdminApiClient` (camelCase). Aliases are local naming — they don't change the underlying ID.

## Context & application aliases

```ts
// create
await admin.createContextAlias({ name: 'my-chat', value: contextId });
await admin.createApplicationAlias({ name: 'chat-app', value: applicationId });

// resolve (value is undefined if not found)
const { value } = await admin.lookupContextAlias('my-chat'); // → contextId
const app = await admin.lookupApplicationAlias('chat-app');

// list / delete
const { aliases } = await admin.listContextAliases(); // [{ name, value }]
await admin.listApplicationAliases();
await admin.deleteContextAlias('my-chat');
await admin.deleteApplicationAlias('chat-app');
```

## Context-identity aliases (scoped to a context)

Name the identities (public keys) inside a context — e.g. "my-key":

```ts
await admin.createContextIdentityAlias(contextId, { name: 'my-key', value: publicKey });
const { value } = await admin.lookupContextIdentityAlias(contextId, 'my-key'); // → publicKey
const { aliases } = await admin.listContextIdentityAliases(contextId);
await admin.deleteContextIdentityAlias(contextId, 'my-key');
```

## Gotchas

- `lookup*` returns `{ value?: string }` — `value` is **undefined** when the alias doesn't exist
  (not an error). Branch on it.
- Aliases are a convenience layer; the canonical key is still the resolved ID — persist the ID, not
  the alias, in durable state.
- Context-identity aliases are **per-context** — the same name can map to different keys in
  different contexts.
