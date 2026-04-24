export const prerender = false;

import type { APIRoute } from "astro";
import { pool } from "../../lib/db";


export const GET: APIRoute = async ({ url }) => {
  try {
    const idTarea = url.searchParams.get("id_tarea");

    const { rows } = idTarea
      ? await pool.query(
          `SELECT id_nota, contenido, fecha_creacion, id_tarea
           FROM nota
           WHERE id_tarea = $1
             AND deleted_at IS NULL
           ORDER BY fecha_creacion DESC`,
          [idTarea]
        )
      : await pool.query(
          `SELECT id_nota, contenido, fecha_creacion, id_tarea
           FROM nota
           WHERE deleted_at IS NULL
           ORDER BY fecha_creacion DESC`
        );

    return json({ success: true, notas: rows });
  } catch (err) {
    console.error("[GET /api/noteEditor]", err);
    return json({ success: false, error: "Error al obtener notas" }, 500);
  }
};


export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await parseBody(request);

    const contenido: string      = (body.contenido ?? "").trim();
    const idTarea:   string|null = body.id_tarea ?? null;

    if (!contenido) {
      return json({ success: false, error: "El contenido no puede estar vacío" }, 400);
    }

    if (!idTarea) {
      return json({ success: false, error: "id_tarea es obligatorio" }, 400);
    }

    // Verificar que la tarea existe (evita FK violation)
    const tareaCheck = await pool.query(
      `SELECT id_tarea FROM tarea WHERE id_tarea = $1 LIMIT 1`,
      [idTarea]
    );
    if (tareaCheck.rowCount === 0) {
      return json({ success: false, error: "Tarea no encontrada" }, 404);
    }

   
    const { rows } = await pool.query(
      `INSERT INTO nota (id_nota, contenido, id_tarea)
       VALUES (gen_random_uuid(), $1, $2)
       RETURNING id_nota, contenido, fecha_creacion, id_tarea`,
      [contenido, idTarea]
    );

    return json({ success: true, nota: rows[0] }, 201);
  } catch (err) {
    console.error("[POST /api/noteEditor]", err);
    return json({ success: false, error: "Error al guardar la nota" }, 500);
  }
};


export const PUT: APIRoute = async ({ request }) => {
  try {
    const body = await parseBody(request);
    const { id_nota, contenido } = body;

    if (!id_nota || !String(contenido ?? "").trim()) {
      return json({ success: false, error: "id_nota y contenido son obligatorios" }, 400);
    }

    // Comprobar que existe y no fue eliminada
    const check = await pool.query(
      `SELECT id_nota FROM nota WHERE id_nota = $1 AND deleted_at IS NULL`,
      [id_nota]
    );
    if (check.rowCount === 0) {
      return json({ success: false, error: "Nota no encontrada" }, 404);
    }

    const { rows } = await pool.query(
      `UPDATE nota
       SET contenido = $1
       WHERE id_nota = $2
         AND deleted_at IS NULL
       RETURNING id_nota, contenido, fecha_creacion, id_tarea`,
      [String(contenido).trim(), id_nota]
    );

    return json({ success: true, nota: rows[0] });
  } catch (err) {
    console.error("[PUT /api/noteEditor]", err);
    return json({ success: false, error: "Error al actualizar la nota" }, 500);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const body = await parseBody(request);
    const { id_nota } = body;

    if (!id_nota) {
      return json({ success: false, error: "id_nota es obligatorio" }, 400);
    }

    const check = await pool.query(
      `SELECT id_nota FROM nota WHERE id_nota = $1 AND deleted_at IS NULL`,
      [id_nota]
    );
    if (check.rowCount === 0) {
      return json({ success: false, error: "Nota no encontrada o ya eliminada" }, 404);
    }

    await pool.query(
      `UPDATE nota SET deleted_at = NOW() WHERE id_nota = $1`,
      [id_nota]
    );

    return json({ success: true, message: "Nota eliminada" });
  } catch (err) {
    console.error("[DELETE /api/noteEditor]", err);
    return json({ success: false, error: "Error al eliminar la nota" }, 500);
  }
};

/* ═══════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════ */

/** Parsea body como JSON o FormData según Content-Type */
async function parseBody(request: Request): Promise<Record<string, any>> {
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    return await request.json();
  }
  // FormData / urlencoded
  const form = await request.formData();
  const obj: Record<string, any> = {};
  form.forEach((val, key) => { obj[key] = val; });
  return obj;
}

/** Crea una respuesta JSON con el status indicado */
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}