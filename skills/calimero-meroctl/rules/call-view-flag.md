# Rule: Read With `--view`, Name the Instance With `-i`

**`meroctl call -i INSTANCE METHOD --args JSON` writes; add `--view` to read.**

## Why

In core 1.0 a call is one of two requests. Without `--view` it is an intent
(`POST /apps/{app}/intents`): it goes through the app's replicated log, as a write. With `--view` it
is a read (`POST /apps/{app}/views`): answered by the leader (or, with `--min-index N`, by any
replica that has applied index `N`), with no write and no log entry. A read sent without `--view`
still works, but costs a log entry and the write path. Both answer `{ index, result, receipt }`.

The instance is the `-i`/`--instance` flag (an alias or an app id) and the method is positional. The
0.x forms (`meroctl call <ctx-id> METHOD`, and "there is no `--view` flag") are wrong for 1.0.

## Correct

```bash
meroctl call -i kv set --args '{"key":"a","value":"1"}'              # a write
meroctl call -i kv get --args '{"key":"a"}' --view                   # a read
meroctl call --instance kv getResult --args '{"key":"a"}' --view      # ABI camelCase names
meroctl call -i kv len --view --min-index 42                         # a stale read is fine past 42
```

## Wrong

<!-- validate-ignore: call-needs-instance (intentional WRONG example: the 0.x positional instance) -->

```bash
meroctl call <ctx-id> get --args '{"key":"a"}'          # 0.x: the instance is not positional
meroctl call -i kv get --args '{"key":"a"}'             # works, but a read logged as a write
```
