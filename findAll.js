import bin from "./find_all.wasm.js";

const { instance } = await WebAssembly.instantiate(bin, {});
const { memory, find_all } = instance.exports;

export const findAll = (textU8, keyU8, cap = 1000000) => {
  if (!(textU8 instanceof Uint8Array) || !(keyU8 instanceof Uint8Array)) {
    throw new TypeError("findAll expects Uint8Array for text/key (UTF-8 bytes).");
  }

  // layout: [text][key][out u32...]
  const textPtr = 0;
  const keyPtr = textPtr + textU8.length;
  const outPtr0 = keyPtr + keyU8.length;
  const outPtr = (outPtr0 & 3) == 0 ? outPtr0 : (outPtr0 & ~3) + 4;

  const outBytes = cap * 4;
  const need = outPtr + outBytes;

  const pagesNeeded = Math.ceil(need / 65536);
  const curPages = memory.buffer.byteLength / 65536;
  if (pagesNeeded > curPages) memory.grow(pagesNeeded - curPages);

  const memU8 = new Uint8Array(memory.buffer);
  memU8.set(textU8, textPtr);
  memU8.set(keyU8, keyPtr);

  const n = find_all(textPtr, textU8.length, keyPtr, keyU8.length, outPtr, cap) >>> 0;
  return new Uint32Array(memory.buffer, outPtr, n).slice(); // sliceでコピーして安定化
};
