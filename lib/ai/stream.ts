import { chunkText } from "@/lib/utils";

export function streamNdjson(events: Array<Record<string, unknown>>) {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= events.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(`${JSON.stringify(events[index])}\n`));
      index += 1;
    }
  });
}

export function streamTextAsEvents(text: string, type = "chunk") {
  const events = chunkText(text).map((content) => ({ type, content }));
  return streamNdjson(events);
}
