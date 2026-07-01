import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const pdfWorkerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).toString();

if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
}

function toUint8Array(data: ArrayBuffer | Uint8Array): Uint8Array {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }

  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

export async function extractTextFromPdf(data: ArrayBuffer | Uint8Array): Promise<string> {
  const loadingTask = pdfjs.getDocument({ data: toUint8Array(data) });
  const pdf = await loadingTask.promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const fragments = content.items.flatMap((item) => {
      if (typeof item === 'object' && item !== null && 'str' in item && typeof item.str === 'string') {
        return [item.str];
      }

      return [];
    });

    pageTexts.push(fragments.join(' '));
  }

  return pageTexts.join('\n').trim();
}