export const prerender = false;

import type { APIRoute } from "astro";
import { pool } from "../../lib/dashboard";

export const POST: APIRoute = async ({ request }) => {
  try {

    const body = await request.json();

    console.log("Datos recibidos en la API:", body);

    const query = `
      INSERT INTO public.tarea (
        titulo, 
        descripcion, 
        fecha_inicio, 
        hora_inicio, 
        prioridad, 
        categoria,
        etiquetas,
        estado, 
        fecha_creacion
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente', NOW())
      RETURNING *;
    `;

    const values = [
      body.titulo || "Sin título",
      body.descripcion || "",
      body.fecha || null,
      body.hora || null,
      body.prioridad || "media",
      body.categoria || "personal",
      body.etiquetas || null
    ];

    const result = await pool.query(query, values);

    return new Response(
      JSON.stringify({
        success: true,
        tarea: result.rows[0]
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {

    console.error("--- ERROR DE POSTGRES ---");
    console.error("Mensaje:", error.message);
    console.error("Código de error:", error.code);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};


export const GET: APIRoute = async () => {
  try {

    const result = await pool.query(`
      SELECT * 
      FROM public.tarea 
      ORDER BY fecha_creacion DESC
    `);

    return new Response(
      JSON.stringify({
        success: true,
        tareas: result.rows
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error: any) {

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { status: 500 }
    );

  }
};