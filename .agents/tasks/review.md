# Daily-batch sending for the WhatsApp blast script

Adds a per-day batch feature so a user can drop ~50 numbers into `kontak.js` but only send `PER_HARI` (default 10) un-sent contacts per run. Batch selection and progress persistence are extracted into a pure CommonJS module `batch.js` (no `whatsapp-web.js` import, so it is testable offline), while `kirim.js` keeps all the sending mechanics. Progress is tracked by normalized phone number (not index) in `progress.json`, recorded immediately after each successful send so a crash never re-sends and a failed send is never marked. A `--reset` CLI path clears progress before touching WhatsApp, and `CARA-PAKAI.md` documents it all in the same casual Indonesian voice.

Watch for: the batch feature correctly preserves every existing send-path behavior (image+caption, `getNumberId` resolution, `JEDA_MS` spacing, `webVersionCache`/`protocolTimeout`) — all confirmed by reading the diff. The one real gap is process, not code: the recorded verification evidence the task refers to is not present in the repo (changes are uncommitted, so there are no commit notes, and `plan.md` is a forward-looking plan with all steps still unchecked). The code itself was reviewed directly and holds up (likely).

**Verdict**: APPROVED

## High-level view

The design choice that matters most is tracking progress **by normalized number rather than by index**. This is what lets the user reorder, add, or delete lines in `kontak.js` between runs without double-sending or skipping anyone — an index cursor would break the moment the list order changed. `pilihBatch` filters out already-sent numbers via a `Set` lookup, then takes the first `perHari` of what remains.

Crash-safety hinges on *when* progress is written. `tandaiTerkirim` is called inside the try block immediately after `sendMessage` resolves, before the inter-send delay. A send that throws, a number that fails validation, or a number that `getNumberId` reports as unregistered all skip the mark — so the fail-open-to-retry behavior the task asked for is in place: failures are retried next run, successes are never repeated.

The API surface added is small: one config constant `PER_HARI` in the ATUR DI SINI block, one new CLI mode (`--reset` / `reset`), and one auto-created, git-ignored state file `progress.json`. All existing send mechanics are untouched; `normalisasiNomor` is now a single source of truth in `batch.js` and aliased back into `kirim.js`.

The known gap is verification evidence. The task framed this as a judge-the-evidence review, but the repo contains only the implementation plan (all checkboxes unchecked) and uncommitted changes — no recorded harness output or commit notes. The code was sound on direct reading, so this is flagged rather than treated as blocking.

<details>
<summary>Issues (2)</summary>

1. **Missing recorded verification evidence** — the task refers to harness results in the coder's final message / commit notes, but the work is uncommitted and only a (still-unchecked) `plan.md` exists; no recorded test output is in the repo. Non-blocking: the batch logic was reviewed directly and is correct, but future passes should capture the harness run output alongside the change.
2. **Invalid numbers consume a daily slot every run** — `pilihBatch` leaves numbers that normalize to < 10 digits in the batch; `kirim.js` skips them without marking them sent, so they reappear and occupy one of the `PER_HARI` slots on every future run. Harmless for valid hand-entered numbers; only worth a note if a persistently-invalid entry could starve the daily count. No change required for the stated use case.

</details>

<details>
<summary>Details</summary>

### Progress keyed by number, not position

`pilihBatch` normalizes every contact to `62xxx`, drops any whose normalized form is already in the `progress.terkirim` set, and slices the first `perHari` survivors. Because the match is on the number string and not a stored cursor, the user can shuffle, insert, or remove rows in `kontak.js` between runs and the "already sent" set still lines up. The returned summary (`total`, `sudahTerkirim`, `sisa`, `batch`, `selesaiSemua`) is consumed identically by `kirim.js`, so the console summary and the loop can't drift from the selection logic.

One behavioral detail to keep in mind: invalid numbers (normalized length < 10) are intentionally left *in* the batch by `pilihBatch` and skipped later in `kirim.js`. That means an invalid number occupies one of the `PER_HARI` slots for the run it appears in. It is never marked sent, so it reappears in every subsequent run and keeps consuming a slot each time. For the stated use case (hand-entered Indonesian mobile numbers) this is a non-issue, but it is the one way the "10 per day" count can effectively deliver fewer than 10 real messages.

### Crash-safe recording and failure handling

```js
await client.sendMessage(chatId, media, { caption: teks }); // or teks only
batch.tandaiTerkirim(PROGRESS_FILE, nomorNorm);   // written immediately
```

`tandaiTerkirim` reads the file, appends the number only if absent (idempotent), and writes right away — so an interruption mid-run leaves every already-delivered number recorded. The three non-delivery paths (empty/short number, `getNumberId` returning `null`, and a thrown `sendMessage`) all reach `gagal++` / `continue` without calling `tandaiTerkirim`, so a failed send is genuinely not marked and will be retried on the next run.

### Preserved send mechanics

The loop now iterates `info.batch` instead of the full `kontak` array, and the `JEDA_MS` guard was updated to `i < info.batch.length - 1`, so the delay still fires between sends and is correctly skipped after the last one. Everything else in the send path is byte-for-byte the prior behavior: image+caption via `MessageMedia.fromFilePath`, `getNumberId` chatId resolution with the fallback to `${nomorNorm}@c.us`, the `webVersionCache` pin, and `protocolTimeout: 120000`. `patch.js` and `kontak.js` are not in the diff. `normalisasiNomor` moved to `batch.js` as the single definition and is aliased back, eliminating the risk of two divergent copies.

### Reset path and done path

`--reset` (and bare `reset`) is handled from `process.argv` before the `Client` is constructed, so it deletes `progress.json` and exits without ever initializing WhatsApp. The "all done" path triggers on `selesaiSemua || batch.length === 0` and destroys the client before the loop, so nothing is sent. Both are documented in `CARA-PAKAI.md`, and the doc's sample output (`Total 50 / Sudah 10 / Dikirim 10`) is consistent with `PER_HARI = 10` — worth keeping in sync if the default ever changes.

### Verification evidence

The task framed this as judging the coder's recorded evidence rather than re-running anything. That evidence is not in the repository: the changes are uncommitted (no commit message or notes), and the only task artifact is `.agents/tasks/plan.md`, which is a plan with every step still showing `[ ]` — it describes the intended harness and `node -c` checks but records no results. The absence of a planted `progress.json`, `_harness.test.js`, or `_progress_test.json` is consistent with the plan's cleanup step having run, which is weak corroboration but not a result log. Rather than run anything (the sandbox can't reach WhatsApp and `node` is wrapped by a missing bootstrap), the batch-selection and progress logic were reviewed directly in `batch.js` and `kirim.js` and are correct. The verdict rests on that direct reading; the missing evidence is recorded as a process finding, not a code defect.

</details>

<details>
<summary>File map</summary>

- `batch.js` (new) — pure CommonJS module: `normalisasiNomor`, `bacaProgress`/`tulisProgress`/`tandaiTerkirim`, `resetProgress`, and the `pilihBatch` selection core.
- `kirim.js` — adds `PER_HARI`, `--reset` handling, per-run batch selection + Indonesian summary, immediate per-success progress recording; send mechanics unchanged.
- `.gitignore` — ignores auto-created `progress.json`.
- `CARA-PAKAI.md` — new Indonesian section explaining daily batching, `PER_HARI`, and `--reset`.

Full diff: `git -C /projects/sandbox/wa-blast-js diff` (plus untracked `batch.js`).

</details>
