# Invitations & joining (namespaces / groups / contexts)

How one user invites another into a shared namespace/group and how the invitee
joins. This is the backbone of any multi-user Calimero app (chat rooms, shared
canvases, teams). All calls go through the mero-js **admin API**
(`AdminApiClient`) and use **camelCase** (mero-js v2 convention).

> Terminology: a *namespace*/*group* is the governance container; *contexts*
> are the per-instance state inside it. You invite into a namespace, then join
> the contexts within it.

## 1. Create an invitation (inviter)

```ts
// admin = new AdminApiClient(httpClient)  (or mero.admin from the provider)
const res = await admin.createNamespaceInvitation(namespaceId);
// → { invitation: SignedGroupOpenInvitation, groupName?: string }
//
// SignedGroupOpenInvitation = {
//   invitation: { inviterIdentity, groupId, expirationHeight, secretSalt,
//                 protocol, network, contractId },
//   inviterSignature: string,
// }
```

The invitation is a node-**signed** object — it can be shared publicly; only a
holder who joins through the node gains access.

## 2. Encode it into a shareable link

Serialize the invitation object to JSON, then encode it for a URL. Two common
encodings (pick one and decode symmetrically):

- **Simple:** `base64url(JSON.stringify(payload))` — fine for most apps.
- **Compact:** `base58(deflate(JSON.stringify(payload)))` — for large payloads.

```ts
const payload = { invitation: res.invitation, groupName: res.groupName };
const token = btoa(JSON.stringify(payload))                  // base64
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); // → base64url

// Web link  — your app reads ?invitation= on load
const webUrl = `${location.origin}/?invitation=${token}`;
// Desktop deep link — opens the Calimero desktop app
const deepLink = `calimero://<app-slug>/join?invitation=${token}`;
```

Optionally embed a human-readable name (e.g. `payload.__teamName`) so the
joiner sees "Acme team" instead of a raw hex id.

## 3. Capture the invitation on load (invitee, web)

Read `?invitation=` **before React mounts**, stash it, strip it from the URL,
and consume it after the user is authenticated. (The studio scaffold does this
in `src/auth/ssoBootstrap.ts` via `takePendingInvitation()`.)

```ts
const raw = new URLSearchParams(location.search).get('invitation');
if (raw) localStorage.setItem('pending-invitation', raw);
```

## 4. Join (invitee)

```ts
const payload = JSON.parse(atob(token.replace(/-/g, '+').replace(/_/g, '/')));
const signed  = payload.invitation;        // SignedGroupOpenInvitation

// groupId may be a byte array — hex-encode it for the path
const rawId = signed.invitation.groupId;
const namespaceId = Array.isArray(rawId)
  ? rawId.map((b: number) => b.toString(16).padStart(2, '0')).join('')
  : String(rawId);

const joined = await admin.joinNamespace(namespaceId, { invitation: signed });
// → { groupId, memberIdentity, governanceOp }

// Pull the latest state, then join the contexts inside the namespace
await admin.syncGroup?.(joined.groupId).catch(() => {});
await admin.joinContext(contextId); // for each context you want to enter
```

After joining, set the member's display name with
`admin.setMemberMetadata(groupId, memberIdentity, { name })` so others see a
real name instead of a public key.

## mero-react hook equivalents

If you use `@calimero-network/mero-react`, prefer the hooks over raw admin
calls — they wire the provider's client and auth for you:

```ts
const { createInvitation } = useCreateNamespaceInvitation();
const { joinNamespace }    = useJoinNamespace();
```

## Gotchas

- **camelCase only** with mero-js v2 (`inviterIdentity`, `groupId`, not
  `inviter_identity`). The node may emit snake_case — normalize on read.
- `groupId` is often a `number[]`; hex-encode before using it in a path.
- Joining is idempotent-ish but **sync after joining** or the UI shows stale
  (empty) state.
- Always handle the invitee already being a member (re-join → treat as success).
- Keep the invitation **out of git history / logs** if it embeds secrets; the
  signed open-invitation is shareable, but treat per-user tokens as sensitive.

See also: `auth.md` (login + tokens), `sso.md` (desktop auth-skip), and the
studio scaffold's `components/InviteModal.tsx` / `components/JoinModal.tsx`.
