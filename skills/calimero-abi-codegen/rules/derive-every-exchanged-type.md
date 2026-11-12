# Rule: every type a method exchanges derives `Record` or `AbiType`

The generator knows only what the ABI's `types` describes, and only `#[derive(Record)]` and
`#[derive(AbiType)]` write a type there. A struct or enum with neither comes out as `unknown`.

## WRONG

```rust,ignore
#[derive(serde::Serialize, serde::Deserialize)]
pub struct Summary {
    pub open: u32,
    pub done: u32,
}
// client.ts: summary(): Promise<unknown>
```

## RIGHT

```rust,ignore
#[derive(serde::Serialize, serde::Deserialize, AbiType)]
pub struct Summary {
    pub open: u32,
    pub done: u32,
}
// client.ts: export interface Summary { open: number; done: number }
```

Table rows derive `Record` (which writes its own serde). A `u64`/`i64`/`Vec<u8>` field of an
`AbiType` struct needs `#[serde(with = "calimero_sdk::json::u64_str")]` (or the bytes form).
