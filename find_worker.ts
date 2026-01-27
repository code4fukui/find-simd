// find_worker.ts
let chunk: string[] = [];
let offset = 0;

self.onmessage = (e) => {
  const d = e.data as any;

  if (d?.cmd === "init") {
    chunk = d.chunk as string[];
    offset = d.offset as number;
    self.postMessage({ cmd: "inited" });
    return;
  }

  if (d?.cmd === "find") {
    const key = String(d.key);
    const indexes: number[] = [];

    for (let i = 0; i < chunk.length; i++) {
      if (chunk[i].includes(key)) indexes.push(offset + i);
    }
    self.postMessage({ cmd: "result", indexes });
    return;
  }
};
