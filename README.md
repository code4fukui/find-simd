# find-simd

> 日本語のREADMEはこちらです: [README.ja.md](README.ja.md)

An experimental library for text search in JavaScript using WebAssembly SIMD.

This project explores the use of WASM SIMD (WASI-SIMD) for accelerating text search. It provides a low-level function for finding all occurrences of a substring within a byte array and a higher-level API for searching through an array of strings.

For comparison, pure JavaScript and multi-threaded JavaScript (Web Worker) implementations are also included. While the SIMD version is fast, the multi-threaded JavaScript implementation often proves to be the most performant for large datasets on multi-core systems.

## Features

-   **WASM SIMD Core**: The search logic is implemented in WebAssembly using SIMD instructions (`i8x16.splat`, `i8x16.eq`, `i8x16.bitmask`) for parallel byte comparison.
-   **High-Level API**: `FindIndexes` provides an easy-to-use interface for searching an array of strings.
-   **Low-Level API**: `findAll` operates directly on `Uint8Array`s for maximum flexibility.
-   **Multi-threaded Version**: A worker-based implementation is available for parallel searching in supported environments.

## APIs and Usage

### High-Level API: `FindIndexes`

Searches an array of strings and returns the indices of the strings that contain the search key.

```javascript
import { FindIndexes } from "https://code4fukui.github.io/find-simd/FindIndexes.js";

// Initialize the WASM module
const findidx = await FindIndexes.create();

const texts = [
  "axche今日はいい天気。今日はa散歩。今日はコーヒー。今日は", // index 0
  "昨日は",                                           // index 1
  "今日は",                                           // index 2
  "今は",                                             // index 3
  "昨年は2025年",                                     // index 4
];

// Set the texts to be searched. This pre-processes the array for fast searching.
findidx.setTexts(texts);

const key = "今日は";
const indexes = findidx.findIndexes(key);

// Returns [0, 2] because texts[0] and texts[2] contain "今日は"
console.log(indexes);
```

### Low-Level API: `findAll`

Searches a single `Uint8Array` (UTF-8 encoded text) and returns the byte offsets of all occurrences of the key.

```javascript
import { findAll } from "https://code4fukui.github.io/find-simd/findAll.js";

const text = "axche今日はいい天気。今日はa散歩。今日はコーヒー。今日は";
const key = "今日は";

// The function expects UTF-8 bytes as Uint8Arrays
const enc = new TextEncoder();
const textU8 = enc.encode(text);
const keyU8 = enc.encode(key);

const hits = findAll(textU8, keyU8);

// Returns the starting byte offset of each match
console.log(hits); // Uint32Array(4) [ 5, 25, 42, 59 ]
```

### Multi-threaded API

This version of `FindIndexes` uses Web Workers to perform searches in parallel, which can offer a significant speedup for large arrays of text.

```javascript
import { FindIndexes } from "https://code4fukui.github.io/find-simd/FindIndexes_threads.ts";

// Specify the number of threads (workers) to use
const fi = await FindIndexes.create({ threads: 6 });

const texts = [
  "axche今日はいい天気。今日はa散歩。今日はコーヒー。今日は",
  "昨日は",
  "今日は",
  "今は",
  "昨年は2025年",
];
fi.setTexts(texts);

const key = "今日は";
const idxs = await fi.findIndexes(key);
console.log(idxs); // [ 0, 2 ]

// Clean up workers
fi.dispose();
```

## How to Build

This is only necessary if you modify the WebAssembly source file (`find_all.wat`).

```bash
# Requires wasm-binaries (wabt)
wat2wasm find_all.wat -o find_all.wasm

# Convert the wasm binary to a JavaScript module
deno run -A https://code4fukui.github.io/bin2js/bin2js.js find_all.wasm
```

-   [bin2js](https://github.com/code4fukui/bin2js)

## License

MIT License — see [LICENSE](LICENSE).