import { CSV } from "https://js.sabae.cc/CSV.js";
import { FindIndexes } from "./FindIndexes.js";
import { FindIndexes as FindIndexes_nosimd } from "./FindIndexes_nosimd.js";
import { FindIndexes as FindIndexes_threads } from "./FindIndexes_threads.ts";

const fn = "./temp/blog-all.csv";
const url = "https://fukuno.jig.jp/blog-all.csv";

const fetchOrLoadCSV = async () => {
  try {
    return await CSV.fetchJSON(fn);
  } catch (e) {
    //console.log(e);
    const bin = await (await fetch(url)).bytes();
    await Deno.writeFile(fn, bin);
    return await fetchOrLoadCSV();
  }
};

const csv = await fetchOrLoadCSV();
//console.log(csv)

const texts = csv.map(i => i.title + "\n" + i.tags + "\n" + i.body);


const key = "HDR";

const find = await FindIndexes.create();
find.setTexts(texts);
console.time("wasm-simd-findIndexes");
const res = find.findIndexes(key);
console.timeEnd("wasm-simd-findIndexes");
console.log(res);

const find2 = await FindIndexes_nosimd.create();
find2.setTexts(texts);
console.time("js-findIndexes");
const res2 = find2.findIndexes(key);
console.timeEnd("js-findIndexes");
console.log(res2);

const find3 = await FindIndexes_threads.create();
find3.setTexts(texts);
console.time("js-threads-findIndexes");
const res3 = await find.findIndexes(key);
console.timeEnd("js-threads-findIndexes");
console.log(res3);
