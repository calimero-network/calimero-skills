# Rule: pick a node runtime — Docker (default) or native merod

`merobox bootstrap run` starts nodes in one of two modes. Docker is the default, but it is **not**
required — `--no-docker` runs nodes as native `merod` binaries instead.

## Docker mode (default)

Uses the image from the workflow's `nodes.image` (e.g. `ghcr.io/calimero-network/merod:edge`).
Requires the Docker daemon to be running.

```bash
docker info                               # should return engine info, not an error
merobox bootstrap run test/smoke.workflow.yml
```

## Native mode — no Docker daemon needed

`--no-docker` runs each node as a native `merod` process. This is what headless CI and the Calimero
Studio worker use (no Docker socket required). `merod` must be on `PATH`, or point at it with
`--binary-path`.

```bash
merobox bootstrap run --no-docker test/smoke.workflow.yml
merobox bootstrap run --no-docker --binary-path /usr/local/bin/merod test/smoke.workflow.yml
```

## Common errors and fixes

| Error                                 | Fix                                                                                                                                                                                                                              |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Cannot connect to the Docker daemon` | Start Docker Desktop / `sudo systemctl start docker` — or switch to `--no-docker`                                                                                                                                                |
| `merod: not found` (native mode)      | Install `merod` and put it on `PATH`, or pass `--binary-path /path/to/merod`                                                                                                                                                     |
| `port is already allocated`           | A host-native node or a previous run holds the port. Raise `nodes.base_port` / `base_rpc_port` in the workflow (the smoke workflows use 12428/12528 to dodge the 2428/2528 defaults), or `merobox nuke` to clear leftover state. |
| `image not found` (Docker mode)       | First run pulls the image — ensure internet access, then re-run.                                                                                                                                                                 |

## Notes

- Workflows clean up after themselves with `nuke_on_start: true` / `nuke_on_end: true`; there is no
  separate `down`/`up`/`status` command (those do not exist — see `references/workflow-files.md` for
  the real command set: `bootstrap run`, `bootstrap validate`, plus top-level `run`, `stop`,
  `health`, `logs`, `nuke`).
- Minimum Docker version (Docker mode only): 20.10+.
