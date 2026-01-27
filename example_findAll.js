import { findAll } from "./findAll.js";

const text = "axche今日はいい天気。今日はa散歩。今日はコーヒー。今日は";
//const key = "a";
const key = "今日は";

// UTF-8 bytes
const enc = new TextEncoder();
const textU8 = enc.encode(text);
const keyU8 = enc.encode(key);

const hits = findAll(textU8, keyU8, 1000);
console.log(hits); // byte offsets

// 表示用に、ヒット位置の周辺だけデコードする例
for (const off of hits) {
  const snippet = new TextDecoder().decode(textU8.subarray(off, off + keyU8.length));
  console.log(off, snippet);
}
