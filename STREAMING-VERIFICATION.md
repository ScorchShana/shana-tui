# Streaming Markdown implementation and verification

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
