# Rule: camelCase names, one object per method

- **App methods and arguments are camelCase on the wire.** The Rust
  `fn add_note(&mut self, note_text: String)` is called as `method: 'addNote'`,
  `args: { noteText }`. A snake_case name is `NotFound` / `BadArgs`.
- **Generated route methods take one object.** `client.orgs.inviteCreate({ org, role })`, not
  `inviteCreate(org, role)`. The positional helpers older releases had (`client.call(app, ...)`,
  `client.getOrg(org)`) are deprecated wrappers: use the route groups.
- **Per-call options come second**: `client.apps.call({ app, method, args }, { confirm })`.

## WRONG

```ts
await client.apps.call({ app: appId, method: 'add_note', args: { note_text: 'hi' } });
```

## RIGHT

```ts
await client.apps.call({ app: appId, method: 'addNote', args: { noteText: 'hi' } });
```
