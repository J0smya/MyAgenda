export const prerender = false;

import type { APIRoute } from "astro";
import { pool } from "../../lib/db";
import { enviarRecordatorioVencimiento, enviarRecordatorioWhatsApp } from "../../lib/email";

function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function procesarRecordatorios() {
  const { rows: tareas } = await pool.query(`
    SELECT t.id_tarea, t.titulo, t.fecha_inicio, t.hora_inicio, t.prioridad,
           u.email, u.telefono
    FROM public.tarea t
    JOIN public.usuario u ON u.id_usuario = t.id_usuario
    WHERE t.fecha_inicio = CURRENT_DATE
      AND t.estado = 'pendiente'
      AND t.recordatorio_enviado = FALSE
      AND t.id_usuario IS NOT NULL
  `);

  let enviados = 0;
  for (const tarea of tareas) {
    try {
      const payload = {
        titulo:      tarea.titulo,
        fecha_inicio: tarea.fecha_inicio,
        hora_inicio:  tarea.hora_inicio,
        prioridad:    tarea.prioridad,
      };

      // Email siempre
      await enviarRecordatorioVencimiento(tarea.email, payload);

      // WhatsApp si el usuario tiene teléfono y Twilio está configurado
      if (tarea.telefono && process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
        try { await enviarRecordatorioWhatsApp(tarea.telefono, payload); }
        catch (eWa: any) { console.error(`Error WhatsApp recordatorio ${tarea.id_tarea}:`, eWa.message); }
      }

      await pool.query(
        `UPDATE public.tarea SET recordatorio_enviado = TRUE WHERE id_tarea = $1`,
        [tarea.id_tarea]
      );
      enviados++;
    } catch (e: any) {
      console.error(`Error enviando recordatorio tarea ${tarea.id_tarea}:`, e.message);
    }
  }
  return enviados;
}

// GET — para cron services como cron-job.org
export const GET: APIRoute = async ({ url }) => {
  const secret = url.searchParams.get("secret");
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
