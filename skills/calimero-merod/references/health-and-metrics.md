# What a merod Node Reports

Source: core's `operate/observability.mdx` and `protocol/networking.mdx`. None of it carries app
state, names or credentials.

| Source                               | Access                                    | What                                                                                                                            |
| ------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `GET /health`                        | public, in the clear                      | `{ ok, node, systemLeader, release, clusterVersion, rollbackEpoch }`, and `waiting` on a node still waiting for the cluster key |
| `GET /attestation?nonce=…`           | public, in the clear                      | the node's TDX quote (mock with `--dev`), what clients verify first                                                             |
| `GET /ops/status`                    | ops token, sealed                         | Raft status of the system group and this node's app groups, governance, fleet, counts                                           |
| `GET /ops/metrics`                   | ops token, sealed                         | Prometheus text                                                                                                                 |
| `GET /metrics` on `--metrics-listen` | plain HTTP, no credential, off by default | the same Prometheus text, for a scraper                                                                                         |
| stdout                               | the host                                  | `tracing` log lines; `RUST_LOG` overrides `info,openraft=warn`                                                                  |

## Health checks

```bash
curl -fsS http://127.0.0.1:2501/health                        # a load balancer's or container's check
meroctl network status                                         # the same, attested and sealed
meroctl --ops-token "$TOKEN" ops status                        # Raft detail
```

`/health` answers before the node has the cluster key; a node that is still waiting (not yet
registered, or no peer has delivered the key) reports `waiting`. A node in TDX mode refuses every
other unsealed request, so `curl` reaches only these two routes; use `meroctl` (or `meroctl proxy`)
for the rest.

## Metrics worth alerting on

| Metric                                             | Watch for                                                    |
| -------------------------------------------------- | ------------------------------------------------------------ |
| `calimero_system_leader`, `calimero_system_voters` | no leader anywhere, or fewer than 3 voters                   |
| `calimero_group_term{group}`                       | a changing term is an election                               |
| `calimero_group_apply_lag{group}`                  | entries logged here but not applied                          |
| `calimero_group_follower_lag{group,peer}`          | on a leader: a follower falling behind                       |
| `calimero_log_undecodable_entries_total{log}`      | anything above zero is a bug                                 |
| `calimero_http_errors_total{group,code}`           | spikes by error code (`QUOTA_EXCEEDED`, ...)                 |
| `calimero_event_streams`                           | open event and presence streams (the limit is 4096 per node) |
| `storage_disk_usage_bytes{store}`                  | the sealed store and snapshots on disk                       |

Labels never carry names: route templates, error codes, group numbers and node ids. The usage family
`calimero_app_*` is labelled with an app's opaque id and its payer's id, for billing.

## Ports

There is one listener per node: `--listen` (default `0.0.0.0:2528`) serves the API, peers' Raft
traffic and app frontends. `merod local` uses `--base-port + i` (2501, 2502, ...). There is no
separate swarm or admin port; `--metrics-listen` is the only other one, and off by default.
