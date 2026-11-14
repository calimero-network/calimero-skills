# The Local Development Cluster

`meroctl local` runs `merod local` in the background: three nodes in one process, mock attestation
and a development storage key. It is for development only; never put real data in it.

## up, status, down

```bash
meroctl local up                    # nodes on http://127.0.0.1:2501-2503, waits until they serve
meroctl local status                # whether it runs, its URLs and the ops token
meroctl local down                  # stop; the state stays for the next `up`
meroctl local up --fresh            # start over with empty state
meroctl local up --nodes 5 --base-port 3501 --dir ./cluster
```

`local up` saves the cluster as the node `local`, trusting its mock quote for that node only, and
makes it the default when there is none. It prints the URLs and the operator's token
(`meroctl --ops-token "$TOKEN" ops status`). Its log is `DIR/merod.log`. A cluster already running
from `--dir` is answered as is. Browser apps on `http://localhost:3000` and `http://localhost:5173`
may sign in against it with passkeys.

### Where merod comes from

- **rc.24 (today)**: `merod` from `PATH`, or the file `MEROD` names; state in `.merod-local/`.
  `--docker [--image IMG]` runs the release's image instead
  (`ghcr.io/calimero-network/merod:<release>`, ports published on `127.0.0.1`, state in the Docker
  volume `meroctl-local-<base port>`). On macOS with no `merod` (releases before 1.0.0-rc.25 shipped
  none) `local up` falls back to the image.
- **rc.25 (coming, core PR #5068)**: the release's Docker image is the default, so Docker must be
  installed and running; `--local` (or `MEROD`) runs the `merod` binary instead, and `--docker` is
  accepted and changes nothing. State moves to `~/.calimero/meroctl/local` (the same from any
  directory); `down` and `status` still find a cluster an older meroctl started in `./.merod-local`.

```bash
meroctl local up --docker           # rc.24: run the release's image
meroctl local up --local            # rc.25: run the merod on PATH instead of the image
```

## dev: the build loop

```bash
meroctl app new my-app && cd my-app      # from calimero-network/apps (template kv-store)
pnpm install
meroctl local dev apps/kv-store          # cluster, build, upload, frontend on :5173, rebuild on save
meroctl local dev apps/kv-store --no-frontend
```

`local dev DIR` (a project with `logic/` and `app/`, or the crate itself) starts the cluster unless
it runs, signs up a deployer of its own, builds the crate, uploads it as a raw bundle, writes
`DIR/app/.env.development.local` (`VITE_CALIMERO_TARGET`, `VITE_CALIMERO_NODES`,
`VITE_CALIMERO_BUNDLE`), runs `pnpm dev` on `http://localhost:5173` and rebuilds and uploads on
every save. Ctrl-C stops the frontend, and the cluster when `dev` started it. It takes the `up`
flags too.

For a build you push yourself: `meroctl app watch --path FILE --dev-passkey F [-c CONTEXT]...` (also
`dev watch`), or `meroctl dev start --path FILE --dev-passkey F --name dev --watch` to install,
create a context and keep pushing.

## test: scenarios

```bash
meroctl local test apps/kv-store         # cargo test of the crate: runs every scenarios/*.json
meroctl local test apps/kv-store -- --nocapture
```

## compute run

```bash
meroctl local compute run compute.component.wasm --method summarize \
  --args '{"lang":"en"}' --input ./doc.txt --out ./out --twice
```

Runs one compute method alone with a job node's engine and caps; `--twice` fails when two runs
differ.

## By hand against the cluster

```bash
meroctl local up
meroctl login --dev-passkey ./dev-passkey.json --name ada
meroctl app pack apps/kv-store/logic --app-version 0.1.0 --out kv-store.mpk
meroctl app install --path ./kv-store.mpk
meroctl context create --package com.calimero.kv-store --name notes --alias notes
meroctl call -c notes set --args '{"key":"a","value":"1"}'
meroctl call -c notes get --args '{"key":"a"}' --view
meroctl local down
```
