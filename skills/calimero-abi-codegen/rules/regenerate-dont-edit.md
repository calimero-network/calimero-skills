# Rule: regenerate the client, never edit it

`client.ts` is a projection of the app's ABI. A hand edit is lost on the next `codegen` and hides a
mismatch between the client and the app the cluster runs.

- A wrong type in the client is a wrong type in the Rust: fix the method's signature or derive
  (`rules/derive-every-exchanged-type.md`), rebuild, regenerate.
- Regenerate whenever the app's methods, errors, events or exchanged types change, from the
  component you are about to ship.
- Do not hand-write a client with `client.apps.call({ app, method: 'addNote', args })` strings when
  a generated one exists: the generated methods are checked against the ABI by the compiler.

## WRONG

```ts
// src/generated/client.ts, edited by hand to fix a type
export interface Note {
  id: string;
  createdMs: number; // was string: u64 travels as a decimal string
}
```

## RIGHT

```bash
meroctl app build . --out my-app.wasm
meroctl app codegen --abi my-app.wasm --lang ts -o src/generated
```

and treat `createdMs` as a decimal string in the frontend (`Number(note.createdMs)` when it fits).
