# Rule: Name the images you trust; `allow_mock` only on development clusters

## What's wrong

```python
client = Client("https://node1.example.com")                    # refuses every real quote
client = Client("https://node1.example.com", allow_mock=True)   # WRONG: trusts quotes that prove nothing
```

With no `tee_profiles`, the client accepts no real TDX quote, so it cannot talk to a production
node. `allow_mock=True` accepts mock quotes, which any process can produce: against a real cluster
it removes the guarantee that the node is an attested image.

## What's correct

```python
# Calimero Cloud or your own TDX cluster: the image profiles its signed mero-tee release lists
client = Client.connect("eu-shared-1", tee_profiles=["<profile>"], min_release="2.3.109")

# A development cluster (merod local, meroctl local up) only
dev = Client("http://127.0.0.1:2501", allow_mock=True)
```

Take the profile and floor from configuration (the cluster's documentation, or what the operator
publishes), not from the node itself. The client never reads `allow_mock` from the environment, so
keep it out of code paths that reach production.

## Why

The client checks the quote, then seals every request to the key that quote binds. The policy is the
only thing that decides which machines may receive your requests and your users' data.
