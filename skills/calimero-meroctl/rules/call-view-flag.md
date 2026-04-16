# Rule: Use --view for Read-Only Methods

**Always pass `--view` when calling a method that only reads state.**

## Why

Without `--view`, the node treats the call as a mutation — it persists the state after the call and
broadcasts a `StateMutation` event to all context members. For read-only methods this is wasteful
(unnecessary writes and network traffic) and may cause unexpected state mutation events in
subscribers.

## How to identify view methods

- **Rust SDK**: method takes `&self` (not `&mut self`)
- **JS SDK**: method is annotated with `@View()`
- **meroctl call**: you cannot tell from the CLI alone — check the app source

## Correct usage

```bash
# Read-only — use --view
meroctl call <ctx-id> get_posts --args '{}' --view
meroctl call <ctx-id> get --args '{"key":"foo"}' --view

# Mutation — no --view
meroctl call <ctx-id> create_post --args '{"title":"Hello"}'
meroctl call <ctx-id> set --args '{"key":"foo","value":"bar"}'
```
