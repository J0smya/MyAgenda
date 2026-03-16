export const prerender = false;

import type { APIRoute } from "astro";
import { pool } from "../../lib/db";

export const POST: APIRoute = async ({ request }) => {
  try {
    // Intentamos obtener los datos del cuerpo de la petición
    const body = await request.json();

    // Log para ver en la terminal qué está llegando desde el Dashboard
    console.log("Datos recibidos en la API:", body);

    // Query ajustada a tu tabla public.tarea
    // Nota: id_proyecto es opcional si ya hiciste el DROP NOT NULL
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
      body.titulo || 'Sin título',
      body.descripcion || '',
      body.fecha || null, 
      body.hora || null,
      body.prioridad || 'media',
      body.categoria || 'personal'
    ];

    const result = await pool.query(query, values);

    // Si todo sale bien, devolvemos la tarea creada
    return new Response(JSON.stringify({ 
      success: true, 
      tarea: result.rows[0] 
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    // Este log aparecerá en tu terminal de VS Code si hay un error de SQL
    console.error("--- ERROR DE POSTGRES ---");
    console.error("Mensaje:", error.message);
    console.error("Código de error:", error.code);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

// También agregamos el método GET por si necesitas recargar las tareas
export const GET: APIRoute = async () => {
  try {
    const result = await pool.query("SELECT * FROM public.tarea ORDER BY fecha_creacion DESC");
    return new Response(JSON.stringify({ success: true, tareas: result.rows }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
};