import type { APIRoute } from "astro";
import { pool } from "../../lib/db";
 
// GET /api/etiquetas → trae todas las etiquetas
export const GET: APIRoute = async () => {
  try {
    const result = await pool.query("SELECT * FROM etiqueta ORDER BY nombre ASC");
    return new Response(JSON.stringify({ success: true, etiquetas: result.rows }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
};
 
// PUT /api/etiquetas → edita nombre y color de una etiqueta
export const PUT: APIRoute = async ({ request }) => {
  try {
    const { id_etiqueta, nombre, color } = await request.json();
    const result = await pool.query(
      "UPDATE etiqueta SET nombre = $1, color = $2 WHERE id_etiqueta = $3 RETURNING *",
      [nombre, color, id_etiqueta]
    );
    if (result.rowCount === 0) {
      return new Response(JSON.stringify({ success: false, error: "No encontrada" }), {
        status: 404, headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true, etiqueta: result.rows[0] }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
};
 
// DELETE /api/etiquetas → elimina una etiqueta por id
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { id_etiqueta } = await request.json();
    const result = await pool.query(
      "DELETE FROM etiqueta WHERE id_etiqueta = $1 RETURNING *",
      [id_etiqueta]
    );
    if (result.rowCount === 0) {
      return new Response(JSON.stringify({ success: false, error: "No encontrada" }), {
        status: 404, headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
};