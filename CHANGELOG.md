## [0.5.1](https://github.com/calimero-network/calimero-skills/compare/v0.5.0...v0.5.1) (2026-11-16)

### Bug Fixes

* the published package keeps its npx bin ([#46](https://github.com/calimero-network/calimero-skills/issues/46)) ([50c4b0d](https://github.com/calimero-network/calimero-skills/commit/50c4b0d9599b5e07e3297176a35db4ce018c84e5))

## [0.5.0](https://github.com/calimero-network/calimero-skills/compare/v0.4.0...v0.5.0) (2026-11-16)

### Features

* **ci:** content linter + version-pin checker (lock in the 0.11 audit) ([bec0b07](https://github.com/calimero-network/calimero-skills/commit/bec0b07a20c285851fc57655e9c2974febb2824c))
* **install:** install skills as Claude Code skills, several at once ([#44](https://github.com/calimero-network/calimero-skills/issues/44)) ([5e6f2c4](https://github.com/calimero-network/calimero-skills/commit/5e6f2c47e27a69712bb1d7767209831e9d4f128e))

### Bug Fixes

* address meroreviewer bot findings on PR [#12](https://github.com/calimero-network/calimero-skills/issues/12) ([c09ba15](https://github.com/calimero-network/calimero-skills/commit/c09ba156a319bb9956252d8fee2871474e666535))
* **check-versions:** paginate the core tags API; address remaining bot notes ([7d92c64](https://github.com/calimero-network/calimero-skills/commit/7d92c64d7df13b896f51a9aca3e0c046353cadd7))
* **deps:** override js-yaml/markdown-it to patched versions for open dependabot alerts ([#21](https://github.com/calimero-network/calimero-skills/issues/21)) ([fffcf84](https://github.com/calimero-network/calimero-skills/commit/fffcf8416abb7c81e8c61cdd52caf23bb6c19a36)), closes [#9](https://github.com/calimero-network/calimero-skills/issues/9) [#6](https://github.com/calimero-network/calimero-skills/issues/6)
* **docs:** correct Mergeable derive macro import to calimero_sdk::app ([a67bf9c](https://github.com/calimero-network/calimero-skills/commit/a67bf9cb61c0776e7547ba1d22b9c9d66da250ca))
* **merobox:** correct fake CLI + workflow schema vs authoritative source ([9322c2c](https://github.com/calimero-network/calimero-skills/commit/9322c2c5b65a12697f84d00a72f375b697a47d8a))
* replace deprecated --node-name flag with --node in meroctl examples ([4e3f2c8](https://github.com/calimero-network/calimero-skills/commit/4e3f2c8aa523f131aedbc10c93abe82a1a13fd96))
* revert bogus SharedStorage→WriterSetCell change — SharedStorage IS a real collection ([de99211](https://github.com/calimero-network/calimero-skills/commit/de9921186dc673758217aae86caad875d2dccf50))
* **rust-sdk, desktop:** correct stale 0.11 content vs authoritative source ([74ac443](https://github.com/calimero-network/calimero-skills/commit/74ac44396d826bc13c9c89ff74838b5a6c899af3))
* **rust-sdk:** drop injected borsh derives, wrap non-Mergeable collection values ([c48f213](https://github.com/calimero-network/calimero-skills/commit/c48f213b3b0e0617be3af323e0da72ce0e7132b5))
* **skills:** correct stale 0.11 content in the remaining 8 skills vs authoritative source ([bc68140](https://github.com/calimero-network/calimero-skills/commit/bc681406ae170407c97ab35a911340babd15e851))
* **skills:** namespace/group/context model + required --group-id (0.11 rc.8) ([6db6969](https://github.com/calimero-network/calimero-skills/commit/6db6969f9f59c0482d24aea1e08d139a389ab3df))
