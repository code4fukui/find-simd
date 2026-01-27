// FindIndexes.ts
type WorkerInit = {
  cmd: "init";
  chunk: string[];
  offset: number; // 元配列での開始index
};

type WorkerFind = {
  cmd: "find";
  key: string;
};

type WorkerResp =
  | { cmd: "inited" }
  | { cmd: "result"; indexes: number[] };

function hardwareConcurrencyFallback() {
  // Deno/Browserのどちらでも動く寄り
  // @ts-ignore - navigator が無い環境もある
  const hc = typeof navigator !== "undefined" ? navigator.hardwareConcurrency : undefined;
  return Math.max(1, (hc ?? 4) - 1);
}

export class FindIndexes {
  static async create(opts?: { threads?: number }) {
    const threads = opts?.threads ?? hardwareConcurrencyFallback();
    return new FindIndexes(threads);
  }

  private texts: string[] = [];
  private cap = 1000;

  private threads: number;
  private workers: Worker[] = [];
  private ready = false;

  constructor(threads = 3) {
    this.threads = Math.max(1, threads);
    //this.threads = Math.min(4, threads);
    //console.log("threads", this.threads);
  }

  setTexts(texts: string[], cap = 1000) {
    this.texts = texts;
    this.cap = cap;
    this.ready = false; // textsが変わったら作り直す
  }

  private async ensureWorkers() {
    if (this.ready) return;

    // 既存workerがあれば捨てる
    for (const w of this.workers) w.terminate();
    this.workers = [];

    const n = Math.min(this.threads, Math.max(1, this.texts.length));
    const chunkSize = Math.ceil(this.texts.length / n);

    const workerUrl = new URL("./find_worker.ts", import.meta.url);

    const initPromises: Promise<void>[] = [];

    for (let t = 0; t < n; t++) {
      const start = t * chunkSize;
      const end = Math.min(start + chunkSize, this.texts.length);
      const chunk = this.texts.slice(start, end);

      const w = new Worker(workerUrl, { type: "module" });
      this.workers.push(w);

      initPromises.push(
        new Promise<void>((resolve, reject) => {
          const onMessage = (e: MessageEvent<WorkerResp>) => {
            if (e.data?.cmd === "inited") {
              w.removeEventListener("message", onMessage as any);
              resolve();
            }
          };
          const onError = (e: ErrorEvent) => {
            w.removeEventListener("message", onMessage as any);
            reject(e.error ?? new Error(e.message));
          };
          w.addEventListener("message", onMessage as any);
          w.addEventListener("error", onError as any);

          const msg: WorkerInit = { cmd: "init", chunk, offset: start };
          w.postMessage(msg);
        }),
      );
    }

    await Promise.all(initPromises);
    this.ready = true;
  }

  async findIndexes(key: string): Promise<number[]> {
    await this.ensureWorkers();

    // cap: 早めに打ち切りしたい場合に備えて、結果は後でslice
    const promises = this.workers.map(
      (w) =>
        new Promise<number[]>((resolve, reject) => {
          const onMessage = (e: MessageEvent<WorkerResp>) => {
            if (e.data?.cmd === "result") {
              w.removeEventListener("message", onMessage as any);
              resolve(e.data.indexes);
            }
          };
          const onError = (e: ErrorEvent) => {
            w.removeEventListener("message", onMessage as any);
            reject(e.error ?? new Error(e.message));
          };
          w.addEventListener("message", onMessage as any);
          w.addEventListener("error", onError as any);

          const msg: WorkerFind = { cmd: "find", key };
          w.postMessage(msg);
        }),
    );

    const parts = await Promise.all(promises);
    const res = parts.flat();
    // 安定のためにソート（分割順なら不要だが保険）
    res.sort((a, b) => a - b);

    return res.length > this.cap ? res.slice(0, this.cap) : res;
  }

  dispose() {
    for (const w of this.workers) w.terminate();
    this.workers = [];
    this.ready = false;
  }
}
