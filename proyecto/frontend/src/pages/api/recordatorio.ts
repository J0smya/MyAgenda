export const prerender = false;

import type { APIRoute } from "astro";
import { procesarRecordatorios } from "../../lib/recordatorio-service";

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// GET — para cron services externos (cron-job.org, etc.)
export const GET: APIRoute = async ({ url }) => {
  const secret         = url.searchParams.get("secret");
  const secretEsperado = process.env.RECORDATORIO_SECRET;

  if (secretEsperado && secret !== secretEsperado) {
    return json({ error: "No autorizado." }, 401);
  }

  try {
    const enviados = await procesarRecordatorios();
    return json({ success: true, enviados });
  } catch (error: any) {
    console.error("Error en recordatorios:", error.message);
    return json({ error: error.message }, 500);
  }
};

// POST — alternativa si el cron service usa POST
export const POST: APIRoute = async ({ request }) => {
  const secretEsperado = process.env.RECORDATORIO_SECRET;
  if (secretEsperado) {
    const body = await request.json().catch(() => ({}));
    if ((body as any).secret !== secretEsperado) {
      return json({ error: "No autorizado." }, 401);
    }
  }

  try {
    const enviados = await procesarRecordatorios();
    return json({ success: true, enviados });
  } catch (error: any) {
    console.error("Error en recordatorios:", error.message);
    return json({ error: error.message }, 500);
  }
};
