export const prerender = false;
import type { APIRoute } from "astro";
import { pool } from "../../lib/db";

function respuesta(texto: string, opciones: string[] = [], estado = "inicio", accion: string | null = null) {
  return new Response(
    JSON.stringify({ success: true, texto, opciones, estado, accion }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { mensaje: msgOriginal, estado = { menu: "inicio" }, datos = {} } = await request.json();
    const mensaje = msgOriginal.toLowerCase().trim();
    let menu = estado.menu || "inicio";

    // Volver al menú principal
    if (["menu", "volver", "inicio", "principal"].some(w => mensaje.includes(w))) {
      return respuesta("👋 ¡Hola! Soy **Aria**.\n\n¿Qué deseas hacer?", 
        ["Crear tarea", "Ver mis tareas", "Crear nota", "Ver mis notas", "Ver archivos", "Resumen"]);
    }

    // ====================== CREAR TAREA ======================
    if (menu === "crear_tarea_titulo" || mensaje.includes("crear tarea")) {
      const titulo = msgOriginal.trim();
      if (titulo.length < 3) {
        return respuesta("Por favor escribe un título más claro:", [], "crear_tarea_titulo");
      }
      return respuesta(`Título: **${titulo}**\n\n¿Cuál es la prioridad?`, 
        ["Alta 🔴", "Media 🟡", "Baja 🔵"], "crear_tarea_prioridad", null);
    }

    if (menu === "crear_tarea_prioridad") {
      let prioridad = "media";
      if (mensaje.includes("alta")) prioridad = "alta";
      else if (mensaje.includes("baja")) prioridad = "baja";

      return respuesta(`Prioridad: **${prioridad}**\n\n¿Para qué fecha?`, 
        ["Hoy", "Mañana", "Elegir fecha"], "crear_tarea_fecha");
    }

    if (menu === "crear_tarea_fecha") {
      const titulo = datos.titulo || msgOriginal; // fallback
      const prioridad = datos.prioridad || "media";

      let fecha_inicio: string;

      if (mensaje.includes("hoy")) {
        fecha_inicio = new Date().toISOString().split('T')[0];
      } else if (mensaje.includes("mañana") || mensaje.includes("manana")) {
        const manana = new Date();
        manana.setDate(manana.getDate() + 1);
        fecha_inicio = manana.toISOString().split('T')[0];
      } else {
        const match = msgOriginal.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
        if (match) {
          const [, d, m, y] = match;
          fecha_inicio = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
        } else {
          return respuesta("Escribe la fecha en formato **DD/MM/AAAA**:", [], "crear_tarea_fecha");
        }
      }

      // Datos acumulados para la confirmación
      return respuesta(
        `¿Confirmas esta tarea?\n\n` +
        `**${titulo}**\n` +
        `Prioridad: ${prioridad}\n` +
        `Fecha: ${fecha_inicio}`,
        ["✅ Sí, crear", "❌ Cancelar"],
        "crear_tarea_confirmacion",
        null
      );
    }

    // === CONFIRMACIÓN FINAL ===
    if (menu === "crear_tarea_confirmacion") {
      if (!mensaje.includes("sí") && !mensaje.includes("crear")) {
        return respuesta("Creación cancelada.", ["Crear tarea", "Volver al menú"]);
      }

      const titulo = datos.titulo || "Sin título";
      const prioridad = datos.prioridad || "media";
      const fecha_inicio = datos.fecha_inicio || new Date().toISOString().split('T')[0]; // fallback

      if (!titulo || titulo === "Sin título") {
        return respuesta("Error: No se pudo obtener el título. Inténtalo de nuevo.", ["Crear tarea"]);
      }

      await pool.query(
        `INSERT INTO tarea (titulo, descripcion, fecha_inicio, prioridad, estado)
         VALUES ($1, '', $2, $3, 'pendiente')`,
        [titulo, fecha_inicio, prioridad]
      );

      return respuesta(`✅ **Tarea creada exitosamente**\n\n**${titulo}**\nFecha: ${fecha_inicio}`, 
        ["Ver mis tareas", "Crear otra tarea"]);
    }

    // ====================== VER TAREAS (Mejorada) ======================
    if (mensaje.includes("ver mis tareas") || mensaje.includes("mis tareas")) {
      const { rows } = await pool.query(`
        SELECT titulo, prioridad, fecha_inicio, hora_inicio 
        FROM tarea 
        WHERE deleted_at IS NULL 
        ORDER BY fecha_inicio DESC, hora_inicio DESC LIMIT 10
      `);

      if (rows.length === 0) return respuesta("No tienes tareas aún.", ["Crear tarea"]);

      const lista = rows.map((t: any) => {
        const prio = t.prioridad === 'alta' ? '🔴' : t.prioridad === 'media' ? '🟡' : '🔵';
        let info = t.fecha_inicio ? new Date(t.fecha_inicio).toLocaleDateString('es-ES', {day:'2-digit', month:'short'}) : '';
        if (t.hora_inicio) info += ` ${t.hora_inicio}`;
        return `${prio} **${t.titulo}**\n   ${info || 'Sin fecha'}`;
      }).join('\n\n');

      return respuesta(`**Tus tareas:**\n\n${lista}`, ["Crear tarea"]);
    }

    // Respuesta por defecto
    return respuesta("¿Qué deseas hacer?", ["Crear tarea", "Ver mis tareas", "Crear nota"]);

  } catch (err: any) {
    console.error("Chatbot Error:", err);
    return respuesta("❌ Ocurrió un error. Inténtalo de nuevo.");
  }
};