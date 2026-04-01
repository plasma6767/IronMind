// Cloudflare Pages Function — proxies all /api/* requests to the Worker.
// Strips the /api prefix so /api/signed-url → /signed-url on the Worker.

export async function onRequest(context: {
  request: Request;
  params: { path?: string[] };
}) {
  const url = new URL(context.request.url);
  const path = "/" + (context.params.path ?? []).join("/");
  const workerUrl = `https://ironmind.logansichelstiel.workers.dev${path}${url.search}`;

  return fetch(workerUrl, context.request);
}
