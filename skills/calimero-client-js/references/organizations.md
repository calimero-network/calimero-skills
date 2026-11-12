# Organizations, invites, roles and teams

An **organization** is the access boundary (v1 "namespace"). Every app instance is created in one,
and the node lets only the org's accounts reach it. Roles rank `guest < member < admin < owner`. A
**team** (v1 "group") narrows an instance to some members. There is no root group to bootstrap, no
identity per context and no executor key: the account id is what the app sees as its caller.

| v1                      | Calimero 1.0                       |
| ----------------------- | ---------------------------------- |
| namespace               | organization (`client.orgs`)       |
| group / subgroup        | team                               |
| context                 | app instance (`client.apps`)       |
| application             | package (a signed `.mpk`)          |
| invitation (signed op)  | org invite (a token)               |
| identity / executor key | account (passkeys are its devices) |

```ts
import { browserPasskey, passkeyConfirm } from '@calimero-network/mero-js';

const { orgId: org } = await client.orgs.create({ name: 'My workspace' });
const { appId } = await client.apps.create({ name: 'board', package: PACKAGE, org });

// An admin invites; the node asks for the admin's passkey.
const confirm = { confirm: passkeyConfirm(browserPasskey()) };
const { token } = await client.orgs.inviteCreate({ org, role: 'member' }, confirm);
const link = `${location.origin}/?invite=${encodeURIComponent(token)}`;

// The invitee opens the link, signs in (or signs up) with THEIR passkey, then redeems it.
await client.orgs.inviteRedeem({ token });
const { apps: shared } = await client.apps.list({ package: PACKAGE });

// Managing members.
const info = await client.orgs.get({ org });
await client.orgs.setMember({ org, account, role: 'admin' }, confirm);
await client.orgs.removeMember({ org, account }, confirm);
```

- `inviteCreate` also takes `teams`, `ttlSecs`, `uses` and `allApps`.
- `client.signUp(passkey, name, { invite: token })` signs up and redeems in one step.
- Keep the invite token out of logs: it is the permission.
- In the app, `guards::require_member()` / `guards::require_admin()` and `env::org_role(account)`
  read the same roles (see the `calimero-rust-sdk` skill).
