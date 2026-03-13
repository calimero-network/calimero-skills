# Rule: Docker must be running before merobox commands

Merobox uses Docker to run node containers. All `merobox up`, `merobox down`, and `merobox status` commands require the Docker daemon to be running.

## Check before running

```bash
docker info  # should return engine info, not an error
merobox up --workflow workflow.yml
```

## Common errors and fixes

| Error | Fix |
| --- | --- |
| `Cannot connect to the Docker daemon` | Start Docker Desktop or `sudo systemctl start docker` |
| `port is already allocated` | Another process (or a previous merobox run) is using that port. Run `merobox down` first or change the port in `workflow.yml` |
| `image not found` | First run pulls images — ensure internet access. Re-run after pull completes. |

## Minimum Docker version

Docker 20.10 or newer is required.

```bash
docker --version  # Docker version 20.10.x or higher
```
