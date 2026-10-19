import type { Pain001Request } from './types';

export const ENDPOINT = '/api/generate-pain001';

export type GenerateResult =
  | { ok: true; xml: string; fileName: string }
  | { ok: false; title: string; details: string[] };

export function fileNameFromHeader(header: string | null, fallback: string): string {
  const match = header && /filename="?([^";]+)"?/.exec(header);
  return match ? match[1] : fallback;
}

export async function generate(req: Pain001Request, fetchImpl: typeof fetch = fetch): Promise<GenerateResult> {
  let res: Response;
  try {
    res = await fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
  } catch {
    return { ok: false, title: 'Server nicht erreichbar', details: ['Bitte Verbindung prüfen und erneut versuchen.'] };
  }

  if (res.ok) {
    const fallback = `pain001_${req.testRunId}_${req.executionDate}_${req.version}.xml`;
    return { ok: true, xml: await res.text(), fileName: fileNameFromHeader(res.headers.get('Content-Disposition'), fallback) };
  }

  if (res.status === 422) {
    const body = (await res.json().catch(() => ({}))) as { details?: string[] };
    const details = body.details ?? [];
    const title = details.length === 1 ? '1 Angabe muss korrigiert werden' : `${details.length} Angaben müssen korrigiert werden`;
    return { ok: false, title, details };
  }

  return { ok: false, title: 'XML konnte nicht erstellt werden', details: [`Server antwortete mit Status ${res.status}.`] };
}

/** Starts a browser download for the generated XML. */
export function download(xml: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
