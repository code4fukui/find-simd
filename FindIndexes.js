import bin from "./find_all.wasm.js";

const encoder = new TextEncoder();

function lowerBound(pos, x) {
  // pos: cumulative end offsets
  let lo = 0, hi = pos.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (pos[mid] > x) hi = mid;
    else lo = mid + 1;
  }
  return lo; // first i with pos[i] > x  => x belongs to text i
}

export class FindIndexes {
  static async create() {
    const { instance } = await WebAssembly.instantiate(bin, {});
    return new FindIndexes(instance);
  }
  constructor(instance) {
    const { memory, find_all } = instance.exports;
    this.memory = memory;
    this.find_all = find_all;
  }
  setTexts(texts, cap = 1000, keymaxlen = 128) {
    const bins = [];
    let len = 0;
    const pos = [];
    const sep = new Uint8Array(1);
    sep[0] = 0;
    for (const text of texts) {
      const bin = encoder.encode(text);
      bins.push(bin);
      bins.push(sep);
      len += bin.length + 1;
      pos.push(len);
    }
    const bin = new Uint8Array(len);
    let idx = 0;
    for (let i = 0; i < bins.length; i++) {
      bin.set(bins[i], idx);
      idx += bins[i].length;
    }
    this.pos = pos;
    const textU8 = bin;
    
    // layout: [text][key][out u32...]
    const textPtr = 0;
    const keyPtr = textPtr + textU8.length;
    const outPtr0 = keyPtr + keymaxlen;
    const outPtr = (outPtr0 & 3) == 0 ? outPtr0 : (outPtr0 & ~3) + 4;

    const outBytes = cap * 4;
    const need = outPtr + outBytes;
    
    const pagesNeeded = Math.ceil(need / 65536);
    const memory = this.memory;
    const curPages = memory.buffer.byteLength / 65536;
    if (pagesNeeded > curPages) memory.grow(pagesNeeded - curPages);

    const memU8 = new Uint8Array(memory.buffer);
    memU8.set(textU8, textPtr);

    this.keyPtr = keyPtr;
    this.textU8 = textU8;
    this.textPtr = textPtr;
    this.outPtr = outPtr;
    this.cap = cap;
    this.keymaxlen = keymaxlen;
  }
  findIndexes(key) {
    const keyU8 = encoder.encode(key);
    const klen = Math.min(keyU8.length, this.keymaxlen);

    const memU8 = new Uint8Array(this.memory.buffer);
    memU8.set(keyU8.subarray(0, klen), this.keyPtr);

    const n = this.find_all(
      this.textPtr, this.textU8.length,
      this.keyPtr, klen,
      this.outPtr, this.cap
    ) >>> 0;

    const offs = new Uint32Array(this.memory.buffer, this.outPtr, n);

    const res = [];
    let last = -1;

    for (let t = 0; t < offs.length; t++) {
      const off = offs[t];

      // 行番号（テキストindex）を二分探索で決定
      const i = lowerBound(this.pos, off);

      // 念のため境界内チェック（区切り無し運用なら必須）
      // end = this.pos[i], start = (i===0 ? 0 : this.pos[i-1])
      // 「off + klen <= end」だけを本当のヒットにする
      const end = this.pos[i];
      if (off + klen > end) continue;

      if (i !== last) { res.push(i); last = i; }
    }
    return res;
  }
}
