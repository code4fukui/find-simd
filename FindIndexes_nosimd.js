export class FindIndexes {
  static async create() {
    return new FindIndexes();
  }
  setTexts(texts, cap = 1000) {
    this.texts = texts;
    this.cap = cap;
  }
  findIndexes(key) {
    const res = [];
    for (let i = 0; i < this.texts.length; i++) {
      if (this.texts[i].includes(key)) res.push(i);
    }
    return res;
  }
}
