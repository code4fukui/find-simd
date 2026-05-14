# find-simd

JavaScriptでWebAssembly SIMDを使用したテキスト検索を行うための実験的ライブラリです。

このプロジェクトは、WASM SIMD (WASI-SIMD) を活用してテキスト検索を高速化する手法を模索するものです。バイト配列内から部分文字列の出現箇所をすべて見つけ出すローレベル関数と、文字列の配列を検索するためのハイレベルAPIを提供します。

比較用として、純粋なJavaScript実装およびマルチスレッドJavaScript（Web Worker）実装も同梱しています。SIMD版も高速ですが、マルチコアシステム上で大規模なデータセットを扱う場合、多くの場合マルチスレッドJavaScript実装が最も高いパフォーマンスを発揮します。

## 機能

-   **WASM SIMD コア**: 検索ロジックはWebAssemblyで実装されており、SIMD命令（`i8x16.splat`、`i8x16.eq`、`i8x16.bitmask`）を用いて並列でのバイト比較を行います。
-   **ハイレベルAPI**: `FindIndexes` は、文字列の配列を検索するための使いやすいインターフェースを提供します。
-   **ローレベルAPI**: `findAll` は `Uint8Array` を直接操作し、最大限の柔軟性を提供します。
-   **マルチスレッド版**: サポートされている環境では、Web Workerベースの実装を利用して並列検索を行うことができます。

## APIと使い方

### ハイレベルAPI: `FindIndexes`

文字列の配列を検索し、検索キーを含む文字列のインデックスを返します。

```javascript
import { FindIndexes } from "https://code4fukui.github.io/find-simd/FindIndexes.js";

// WASMモジュールを初期化
const findidx = await FindIndexes.create();

const texts = [
  "axche今日はいい天気。今日はa散歩。今日はコーヒー。今日は", // インデックス 0
  "昨日は",                                           // インデックス 1
  "今日は",                                           // インデックス 2
  "今は",                                             // インデックス 3
  "昨年は2025年",                                     // インデックス 4
];

// 検索対象のテキストを設定します。これにより、高速検索のために配列が事前処理されます。
findidx.setTexts(texts);

const key = "今日は";
const indexes = findidx.findIndexes(key);

// texts[0] と texts[2] に「今日は」が含まれているため、[0, 2] を返します
console.log(indexes);
```

### ローレベルAPI: `findAll`

単一の `Uint8Array`（UTF-8エンコードされたテキスト）を検索し、キーが出現するすべての位置のバイトオフセットを返します。

```javascript
import { findAll } from "https://code4fukui.github.io/find-simd/findAll.js";

const text = "axche今日はいい天気。今日はa散歩。今日はコーヒー。今日は";
const key = "今日は";

// この関数はUTF-8のバイト列をUint8Arrayとして受け取ります
const enc = new TextEncoder();
const textU8 = enc.encode(text);
const keyU8 = enc.encode(key);

const hits = findAll(textU8, keyU8);

// 各マッチの開始バイトオフセットを返します
console.log(hits); // Uint32Array(4) [ 5, 25, 42, 59 ]
```

### マルチスレッドAPI

このバージョンの `FindIndexes` は、Web Workerを使用して並列に検索を実行します。大規模なテキスト配列に対して大幅な高速化が期待できます。

```javascript
import { FindIndexes } from "https://code4fukui.github.io/find-simd/FindIndexes_threads.ts";

// 使用するスレッド（ワーカー）の数を指定します
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

// ワーカーをクリーンアップします
fi.dispose();
```

## ビルド方法

これはWebAssemblyのソースファイル（`find_all.wat`）を変更した場合にのみ必要です。

```bash
# wasm-binaries (wabt) が必要です
wat2wasm find_all.wat -o find_all.wasm

# wasmバイナリをJavaScriptモジュールに変換します
deno run -A https://code4fukui.github.io/bin2js/bin2js.js find_all.wasm
```

-   [bin2js](https://github.com/code4fukui/bin2js)

## ライセンス

MIT License — 詳細は [LICENSE](LICENSE) を参照してください。
