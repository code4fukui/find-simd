# find-simd

> 日本語のREADMEはこちらです: [README.ja.md](README.ja.md)

Text search using WebAssembly SIMD, but slower than JavaScript.

## Features
- `i8x16.bitmask`
- `i8x16.splat`
- `i8x16.eq`

## Usage

```js
import { FindIndexes } from "https://code4fukui.github.io/find-simd/FindIndexes.js";

const findidx = await FindIndexes.create();

const texts = [
  "axche今日はいい天気。今日はa散歩。今日はコーヒー。今日は",
  "昨日は",
  "今日は",
];

findidx.setTexts(texts, 100);

const key = "今日は";
const idx = findidx.findIndexes(key);
console.log(idx);
```

## How to Build

```js
wat2wasm find_all.wat -o find_all.wasm
deno run -A https://code4fukui.github.io/bin2js/bin2js.js find_all.wasm
```
- [bin2js](https://github.com/code4fukui/bin2js)

## License
MIT