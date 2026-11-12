# Rule: let mero-js refresh the session, and store the refreshed one

mero-js refreshes an expired session on its own (one refresh and a repeat on a `401`), and has no
event that says it did. There is no `getAccessToken()` / `setAccessToken()` and no JWT to manage by
hand.

A page that persists the session across reloads saves `client.session` after calls. The generated
client's `after` option runs after every call and view, refused ones included:

```ts
const notes = new NotesClient(client, appId, {
  after: () => {
    const session = client.session;
    if (session) localStorage.setItem('calimero-session', JSON.stringify(session));
  },
});

// On reload:
const saved = localStorage.getItem('calimero-session');
if (saved) client.useSession(JSON.parse(saved));
```

`client.signOut()` ends this session; `client.signOutEverywhere()` ends every session of the
account.
