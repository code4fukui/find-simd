import { FindIndexes } from "./FindIndexes.js";
//import { FindIndexes } from "./FindIndexes_nosimd.js";

const findidx = await FindIndexes.create();

const texts = [
  "axche今日はいい天気。今日はa散歩。今日はコーヒー。今日は",
  "昨日は",
  "今日は",
  "今は",
  "昨年は2025年",
];

findidx.setTexts(texts, 100);

const key = "今日は";
const idx = findidx.findIndexes(key);
console.log(idx);
