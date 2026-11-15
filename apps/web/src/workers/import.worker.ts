import { parseTable } from "@vlezet/io";
self.onmessage = (e: MessageEvent) => {
  try {
    self.postMessage({
      id: e.data.id,
      preview: parseTable(new Uint8Array(e.data.bytes), e.data.options),
    });
  } catch (error) {
    self.postMessage({
      id: e.data.id,
      error: error instanceof Error ? error.message : "Ошибка файла",
    });
  }
};
