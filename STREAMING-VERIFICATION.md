# Streaming Markdown implementation and verification

For the public API, lifecycle example, and options, see [Streaming Markdown](README.md#streaming-markdown) and the preceding Markdown reference. This document records implementation details and verification limits.

Public addition: `Markdown.setStreaming(boolean)`. It does not schedule a redraw.
Callers must end streaming and request their usual render in `finally`, including cancellation and errors. This repository contains no production streaming caller; the transcript benchmark demonstrates the lifecycle.

Exact results remain instance-local and strongly retained. Ending streaming drops that instance's weak token entry and defers full parsing to its next render. Repeated identical text/state updates preserve results. Preview uses a separate Markdown instance for its bounded tail, never exact block caches. Transform callbacks retain the full-source synchronous path.

The preview syntax window is at most 32 logical lines and 16,384 UTF-16 units after CR and tab normalization. Complete overflow lines are staged as plain terminal text. Oversized mutable logical lines also use plain text; their wrapping is chunked to avoid quadratic behavior. Comments are hidden by scanning the complete current source before partitioning. This deliberately uses a full scan rather than an incremental scanner: replacements and split delimiters share one correctness path, at the cost of linear scanning on updates. Preview prefixes are approximate and can lose formatting as the window advances. Completion always restores the ordinary full-source result.

History snapshots use internal WeakMaps. Built-in leaves still validate their own render caches each frame; containers check child order and snapshot identities. Intermediate snapshots retain structure and heights; document roots retain one flattened result. Custom renderers and overridden methods use the existing path, including sparse custom root arrays. Normal screen, fullscreen legacy, and layout-root rendering are connected. Public Container.render remains unchanged.

Verification: type check, complete existing suite, added streaming/cache/budget tests, and a fresh independent code review. Review found CR line-count handling and missing normal-screen integration; both were fixed. Tests clear the weak token entry deterministically to verify the strong line cache rather than depending on nondeterministic collection. Manual interactive terminal testing and rigorous allocation-profiler / removed-object GC measurements were not performed.

Run `node --expose-gc test/history-streaming-bench.ts` for median/P95, sampled heap peak and post-GC heap deltas. These heap values are not per-frame allocation measurements. One Windows run with 2,500 messages produced:

| Scenario | Median ms | P95 ms |
|---|---:|---:|
| Direct Container static reference | 0.130 | 0.325 |
| Snapshot static | 0.108 | 0.312 |
| Markdown preview | 0.605 | 1.358 |
| 60,000-unit emoji line preview | 10.761 | 11.643 |
| Code preview | 0.540 | 0.873 |
| Alternating width | 32.354 | 36.265 |

Final parse samples were 6.724 ms (Markdown), 98.482 ms (long line), 3.902 ms (code). They are single samples, not distributions. Static median improved about 17%, below the experimental 20% target; this comparison isolates document flattening and is not an end-to-end before/after claim. Sampled static heap peak delta decreased from 39.4 MB to 16.7 MB. Timing and GC vary substantially between runs. Full scanning, component checks, changed-root reconstruction and final synchronous parsing remain costs.

## Follow-up: incremental long-line wrapping experiment

The checkpoint prototype was implemented and tested, then removed under the plan's performance fallback rule. Public interfaces remain unchanged. The retained change fixes unfinished-line cache reuse and sanitizes the whole plain prefix before checking reuse, so completed escape sequences cannot leave stale visible fragments.

Three alternating runs against isolated commit f7bf042 used 2,500 historical messages, an initial 60,000-unit emoji line, 32 appended units per frame, 20 warmup and 200 measured frames. Median of the three per-run statistics:

| Implementation | Median ms | P95 ms | Result rows / cold rows |
|---|---:|---:|---:|
| Original baseline | 0.594 | 0.897 | 970 / 838 (incorrect) |
| Checkpoint prototype (removed) | 0.580 | 1.566 | 838 / 838 |

The prototype improved median by only 2.3% and worsened P95 by about 75%, failing the required 20% median improvement and at-most-10% P95 regression. Post-GC heap delta fell from about 28.1 MB to 0.30 MB, but this cannot override the timing acceptance gate. The baseline is faster partly because it incorrectly treats unfinished text as immutable, so its timing is not a valid correctness-equivalent reference.

Per the agreed fallback, retain only the correctness fix and new regression tests. Unfinished long lines are rebuilt, so this fallback does not claim incremental wrapping performance or bounded wrapping work. Existing newline-terminated prefix reuse remains. The full size/type benchmark matrix and 100/5,000-update retention gate were not pursued after the prototype failed its primary gate. No new persistent cache is present in the retained implementation.

Run `node --expose-gc test/markdown-append-bench.ts` to reproduce the true-append scenario with heap samples and live/cold row counts. Regression tests cover append partitions, sanitized-prefix changes, Unicode boundaries, invalidation and unchanged previous output arrays. Full comments and normalization scans are retained.

Final retained fallback sample: median 9.546 ms, P95 11.164 ms, 838 live/cold rows, post-GC heap delta 316,800 bytes. This is a correctness repair with an explicit performance cost relative to the incorrect original. Type check, all 10 streaming regression tests, full test suite and independent review passed.
