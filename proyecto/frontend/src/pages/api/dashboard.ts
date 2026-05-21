// src/pages/api/dashboard.ts
export const prerender = false;

import type { APIRoute } from "astro";
import { pool } from "../../lib/db";

// --- MÉTODO POST: CREAR TAREA ---
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Validación básica
    if (!body.titulo) {
        return new Response(JSON.stringify({ success: false, message: "El título es obligatorio." }), { status: 400 });
    }

    // Asegúrate de que estos nombres de columnas coincidan EXACTAMENTE con tu tabla en pgAdmin
    const query = `
      INSERT INTO public.tarea (
        titulo, 
        descripcion, 
        fecha_inicio, 
        hora_inicio, 
        prioridad, 
        categoria,
        estado, 
        fecha_creacion
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'pendiente', NOW())
      RETURNING *;
    `;

    const values = [
      body.titulo.trim(),
      body.descripcion?.trim() || "",
      body.fecha || null,
      body.hora || null,
      body.prioridad || "media",
      body.categoria || "personal"
    ];

    const result = await pool.query(query, values);

    return new Response(JSON.stringify({ success: true, tarea: result.rows[0] }), { status: 200 });

  } catch (error: any) {
    console.error("❌ ERROR EN EL SERVIDOR (POST):", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
};

// --- MÉTODO GET: OBTENER TAREAS ---
export const GET: APIRoute = async () => {
  try {
    const result = await pool.query('SELECT * FROM public.tarea ORDER BY fecha_creacion DESC');
    return new Response(JSON.stringify({ success: true, tareas: result.rows }), { status: 200 });
  } catch (error: any) {
    console.error("❌ ERROR AL OBTENER TAREAS:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
};

// --- MÉTODO DELETE: ELIMINAR TAREA ---
export const DELETE: APIRoute = async ({ url }) => {
  try {
    const id = url.searchParams.get("id");
    if (!id) return new Response(JSON.stringify({ success: false, message: "ID no proporcionado" }), { status: 400 });

    const result = await pool.query('DELETE FROM public.tarea WHERE id_tarea = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return new Response(JSON.stringify({ success: false, message: "Tarea no encontrada" }), { status: 404 });
    }

    return new Response(JSON.stringify({ success: true, message: "Tarea eliminada" }), { status: 200 });
  } catch (error: any) {
    console.error("❌ ERROR AL ELIMINAR:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
};