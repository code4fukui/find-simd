import { FindIndexes } from "./FindIndexes_threads.ts";

const texts = [
  "axche今日はいい天気。今日はa散歩。今日はコーヒー。今日は",
  "昨日は",
  "今日は",
  "今は",
  "昨年は2025年",
];

const key = "今日は";

const fi = await FindIndexes.create({ threads: 6 });
fi.setTexts(texts, 1000);

const idxs = await fi.findIndexes(key);
console.log(idxs);
fi.dispose();
