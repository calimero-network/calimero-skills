# Following an instance's events

The app emits events with `env::emit(Event::X { .. }, audience)`; they are delivered once the call
commits. The client reads them as an async generator of `{ id, kind, data }`:

```ts
const controller = new AbortController();
for await (const event of client.events(appId, 0, controller.signal)) {
  if (event.kind === 'NoteAdded') console.log(event.data.id, event.data.author);
}
// controller.abort() ends the stream.
```

- `events(app, from = 0, signal?)`: `from` is a log index; pass the `index` of a view plus one to
  follow only what that view does not already reflect.
- `kind` is the Rust variant name; `data` its fields, camelCase.
- The generated client's `svc.events(from?, signal?)` yields the same, typed as the app's `AppEvent`
  union.
- There is no WebSocket subscription by context and no `StateMutation` event: re-fetch with a view
  when an event says something changed.
- `client.presenceStream(app, signal?)` follows who is online in an instance.
