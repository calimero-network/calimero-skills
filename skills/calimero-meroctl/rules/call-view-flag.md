# Rule: A "View" Is Just a Read-Only Method — There Is No `--view` Flag

**Call read-only ("view") methods exactly like any other method. `meroctl call` has no `--view`
flag.**

## Why

A view is not a special call mode at the CLI — it is simply a method that only reads state. The node
decides whether a call mutated state from what the handler actually did, not from a flag you pass.
`meroctl call` accepts the **method name positionally** and the context via `--context` (`-c`); its
only flags are `--args`, `--id`, `--substitute`, `--interactive`/`-i`, and `--timeout`. Passing
`--view` is an error — clap will reject it.

## How to identify read-only methods

- **Rust SDK**: method takes `&self` (not `&mut self`)
- **JS SDK**: method is annotated with `@View()`
- **meroctl call**: you cannot tell from the CLI alone — check the app source. There is nothing to
  pass differently either way.

## Correct usage

The method name comes first (positional); the context is the `--context` flag:

```bash
# Read-only method — same form as any call, no --view
meroctl call get_posts --context <context-id> --args '{}'
meroctl call get --context <context-id> --args '{"key":"foo"}'

# Mutation — identical form
meroctl call create_post --context <context-id> --args '{"title":"Hello"}'
meroctl call set --context <context-id> --args '{"key":"foo","value":"bar"}'
```

## Don't do this

<!-- validate-ignore: no-view-flag (intentional WRONG example demonstrating the missing flag) -->

```bash
# WRONG: there is no --view flag, and the context is a flag, not a leading positional
meroctl call <ctx-id> get_posts --args '{}' --view
meroctl call <ctx-id> get --args '{"key":"foo"}' --view
```
