# Rule: Read With `--view`, Name the Context With `-c`

**`meroctl call -c CONTEXT METHOD --args JSON` writes; add `--view` to read.**

## Why

In core 1.0 a call is one of two requests. Without `--view` it is an intent
(`POST /apps/{app}/intents`): it goes through the app's replicated log, as a write. With `--view` it
is a read (`POST /apps/{app}/views`): answered by the leader (or, with `--min-index N`, by any
replica that has applied index `N`), with no write and no log entry. A read sent without `--view`
still works, but costs a log entry and the write path. Both answer `{ index, result, receipt }`.

The context is the `-c`/`--context` flag (an alias or an app id) and the method is positional. The
0.x forms (`meroctl call <ctx-id> METHOD`, and "there is no `--view` flag") are wrong for 1.0.

## Correct

```bash
meroctl call -c kv set --args '{"key":"a","value":"1"}'              # a write
meroctl call -c kv get --args '{"key":"a"}' --view                   # a read
meroctl call --context kv getResult --args '{"key":"a"}' --view      # ABI camelCase names
meroctl call -c kv len --view --min-index 42                         # a stale read is fine past 42
```

## Wrong

<!-- validate-ignore: call-needs-context (intentional WRONG example: the 0.x positional context) -->

```bash
meroctl call <ctx-id> get --args '{"key":"a"}'          # 0.x: the context is not positional
meroctl call -c kv get --args '{"key":"a"}'             # works, but a read logged as a write
```
