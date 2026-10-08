# CP11-CI — Post-restore physical verification

Existing private-file restore now reopens the actual destination files through the reviewed bounded reader and verifies complete descriptors, sizes and SHA256 after exclusive synced writes. Success includes verifiedFiles, alongside restoredFiles; a mismatch refuses success and the existing CLI cleanup removes only newly owned schema/directory. No routing or hosting configuration involved.

Local standalone crypto/file3/lint/script syntax/diff PASS. Actual native proof now checks verifiedFiles=1 and, on Linux CI, applies a real non-writable destination directory after exclusive creation; restore must fail and remove both the newly imported schema and files target while preserving source. No production flag or error-injection hook added to runtime. Actual acceptance pending. Latest d2071a7 FARO37771876387/CI37771876392 SUCCESS (full runtime/native26 browsers Node22/24); unchanged application UI/TS/schema proofs remain applicable.

Hosting is unspecified by the user. Render inspection permission did not authorize provider selection; its earlier review draft is optional unused reference, not a global blocker. No paid resources or deploy executed. Entire plan/release PARTIAL; real secrets/custody/deployment environment and external validation/owners remain necessary to certify production.
