export const prerender = false;

import type { APIRoute } from "astro";
import { pool } from "../../lib/db";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { email, codigo } = await request.json();

    if (!email || !codigo) {
      return json({ ok: false, error: "Datos incompletos." }, 400);
    }

    const result = await pool.query(
      `SELECT id, expires_at, usado
       FROM public.verificacion_email
       WHERE email = $1 AND codigo = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [email, codigo.toString().trim()]
    );

    if (result.rows.length === 0) {
      return json({ ok: false, error: "Código incorrecto." }, 400);
    }

    const row = result.rows[0];

    if (row.usado) {
      return json({ ok: false, error: "Este código ya fue usado." }, 400);
    }

    if (new Date() > new Date(row.expires_at)) {
      return json({ ok: false, error: "El código ha expirado." }, 400);
    }

    await pool.query(
      "UPDATE public.verificacion_email SET usado = TRUE WHERE id = $1",
      [row.id]
    );
    await pool.query(
      "UPDATE public.usuario SET email_verificado = TRUE WHERE email = $1",
      [email]
    );

    return json({ ok: true });

  } catch (error: any) {
    console.error("ERROR VERIFICAR:", error.message);
    return json({ ok: false, error: "Error interno." }, 500);
  }
};

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json" }
  });
}