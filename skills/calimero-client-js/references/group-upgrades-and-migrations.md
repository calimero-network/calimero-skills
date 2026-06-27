# Group upgrades & migrations (0.11+)

Upgrade a group/namespace to a new application version and track the per-member migration as peers
apply it. Calimero 0.11. All via `AdminApiClient`, **camelCase**.

> Upgrades are **asynchronous**: `upgradeGroup` returns once the upgrade op is published; each peer
> migrates its own state independently. You poll status to know when everyone has converged.

## Start an upgrade

```ts
const res = await admin.upgradeGroup(groupId, {
  targetApplicationId: 'app-v2-id',
  cascade: true, // also upgrade descendant subgroups on the same app (default false)
  requester: myPublicKey, // optional
});
// → { groupId, status, total?, completed?, failed? }
```

`UpgradeGroupRequest` is exactly `{ targetApplicationId, cascade?, requester? }` — there is no
`migrateMethod`/`migrate_method` field. The migrate entrypoint is declared by the _target_ app, not
selected here.

## Poll group upgrade status

```ts
const status = await admin.getGroupUpgradeStatus(groupId);
// → GroupUpgradeStatus | null   (null = no active upgrade)
if (status) {
  console.log(
    `${status.completed ?? 0}/${status.total ?? 0} migrated, ${status.failed ?? 0} failed`
  );
  // status = { fromVersion, toVersion, initiatedAt, initiatedBy, status,
  //            total?, completed?, failed?, completedAt? }
}
```

## Namespace-wide migration rollup (richer)

```ts
const m = await admin.getMigrationStatus(namespaceId);
// m.rollup = { migrated, inProgress, unknown, failed, total, allMigrated,
//              membersPendingSignature }
if (m.rollup.allMigrated) console.log('done');
// m.members[] = { peer, state: 'migrated'|'in_progress'|'unknown'|'failed', report }
```

For a cascade upgrade, inspect each subgroup:

```ts
const entries = await admin.getCascadeStatus(namespaceId);
// → [{ groupId, upgrade: GroupUpgradeStatus, cascadeHlc? }]
```

## Retry failed members

```ts
await admin.retryGroupUpgrade(groupId, { requester: myPublicKey });
// re-publishes the upgrade op; peers that failed re-attempt the migrate
```

## Events

`mero-js` exports an SSE event for version changes — surface "this app updated, reload" UX:

```ts
import { SseClient, AppVersionChangedEvent } from '@calimero-network/mero-js';
```

## Gotchas

- **Async + eventual:** never assume a member migrated just because `upgradeGroup` returned — poll
  `getGroupUpgradeStatus` / `getMigrationStatus`.
- `getGroupUpgradeStatus` returns **null** when nothing is in flight (not an error).
- The migrate entrypoint lives in the _target_ app — the upgrade request does not name it. Apps with
  forward-compatible state need no migrate fn at all.
- `cascade` (default false) fans the upgrade to subgroups running the same app atomically — leave it
  off if subgroups run different apps.
- `membersPendingSignature` > 0 means some members still owe authored ops; the migration isn't truly
  settled until it hits 0.
