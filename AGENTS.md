# Inkstone project conventions

- The source repository is public and MIT licensed, per the owner's decision on 2026-11-23. This supersedes earlier private-source instructions.
- Every published version must have a source tag `v<version>` pointing to the exact source commit used for its installers. Never move or reuse a published tag; increment the version for subsequent fixes.
- Keep package.json, package-lock.json, Cargo.toml, Cargo.lock and tauri.conf.json versions consistent. Run `npm run check:version` before packaging; CI also validates tag names.
- Publish new releases in quickwkq/inkstone. Preserve quickwkq/inkstone-releases as the historical download archive.
- Include arm64 and x64 DMG/ZIP files and SHA256SUMS.txt. Verify App bundle signatures and representative document behavior. Distinguish browser checks, local Apple Silicon checks and untested Intel hardware behavior.
- Builds use ad-hoc signing without Developer ID or Apple notarization. Do not claim Gatekeeper trust.
- Never commit user documents, credentials, generated installers or local application data.
