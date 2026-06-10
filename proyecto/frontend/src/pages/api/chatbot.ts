export const prerender = false;
import type { APIRoute } from "astro";
import { pool } from "../../lib/db";
 
function respuesta(
  texto: string,
  opciones: string[] = [],
  estado = "inicio",
  accion: string | null = null,
  datosRetorno: Record<string, any> = {}
) {
  return new Response(
    JSON.stringify({ success: true, texto, opciones, estado, accion, datosRetorno }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
 
export const POST: APIRoute = async ({ request }) => {
  try {
    const {
      mensaje: msgOriginal,
      estado = { menu: "inicio" },
      datos = {},
    } = await request.json();
 
    const mensaje = msgOriginal.toLowerCase().trim();
    const menu = estado.menu || "inicio";
 
    // ── Volver al menú principal ──
    if (["menu", "volver", "inicio", "principal"].some(w => mensaje.includes(w))) {
      return respuesta(
        "👋 ¡Hola! Soy **Aria**.\n\n¿Qué deseas hacer?",
        ["Crear tarea", "Ver mis tareas", "Crear nota", "Ver mis notas", "Resumen"]
      );
    }
 
    // ═══════════════════════════════════════════
    // CREAR TAREA — paso 1: pedir título
    // ═══════════════════════════════════════════
    if (menu === "inicio" && mensaje.includes("crear tarea")) {
      return respuesta(
        "¡Vamos! ¿Cuál es el **título** de la tarea?",
        [],
        "crear_tarea_titulo"
      );
    }
 
    // Paso 2: recibir título, pedir prioridad
    if (menu === "crear_tarea_titulo") {
      const titulo = msgOriginal.trim();
      if (titulo.length < 2) {
        return respuesta("Por favor escribe un título más claro:", [], "crear_tarea_titulo");
      }
      return respuesta(
        `Título: **${titulo}**\n\n¿Cuál es la prioridad?`,
        ["Alta 🔴", "Media 🟡", "Baja 🔵"],
        "crear_tarea_prioridad",
        null,
        { titulo } // ← retornamos el título para que el frontend lo acumule
      );
    }
 
    // Paso 3: recibir prioridad, pedir fecha
    if (menu === "crear_tarea_prioridad") {
      let prioridad = "media";
      if (mensaje.includes("alta")) prioridad = "alta";
      else if (mensaje.includes("baja")) prioridad = "baja";
 
      return respuesta(
        `Prioridad: **${prioridad}**\n\n¿Para qué fecha?`,
        ["Hoy", "Mañana", "Esta semana"],
        "crear_tarea_fecha",
        null,
        { ...datos, prioridad } // ← acumulamos prioridad junto a lo anterior
      );
    }
 
    // Paso 4: recibir fecha, mostrar confirmación
    if (menu === "crear_tarea_fecha") {
      let fecha_inicio: string;
 
      if (mensaje.includes("hoy")) {
        fecha_inicio = new Date().toISOString().split("T")[0];
      } else if (mensaje.includes("mañana") || mensaje.includes("manana")) {
        const manana = new Date();
        manana.setDate(manana.getDate() + 1);
        fecha_inicio = manana.toISOString().split("T")[0];
      } else if (mensaje.includes("semana")) {
        const semana = new Date();
        semana.setDate(semana.getDate() + 7);
        fecha_inicio = semana.toISOString().split("T")[0];
      } else {
        const match = msgOriginal.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
        if (match) {
          const [, d, m, y] = match;
          fecha_inicio = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
        } else {
          return respuesta(
            "Escribe la fecha en formato **DD/MM/AAAA** o elige una opción:",
            ["Hoy", "Mañana", "Esta semana"],
            "crear_tarea_fecha"
          );
        }
      }
 
      const titulo = datos.titulo || "Sin título";
      const prioridad = datos.prioridad || "media";
      const prioEmoji = prioridad === "alta" ? "🔴" : prioridad === "media" ? "🟡" : "🔵";
 
      return respuesta(
        `¿Confirmas esta tarea?\n\n📌 **${titulo}**\n${prioEmoji} Prioridad: ${prioridad}\n📅 Fecha: ${fecha_inicio}`,
        ["✅ Sí, crear", "❌ Cancelar"],
        "crear_tarea_confirmacion",
        null,
        { ...datos, fecha_inicio } // ← acumulamos fecha_inicio
      );
    }
 
    // Paso 5: confirmación final → insertar en DB
    if (menu === "crear_tarea_confirmacion") {
      if (!mensaje.includes("sí") && !mensaje.includes("si") && !mensaje.includes("crear")) {
        return respuesta("Creación cancelada. ¿Qué deseas hacer?", ["Crear tarea", "Ver mis tareas"]);
      }
 
      const titulo = datos.titulo;
      const prioridad = datos.prioridad || "media";
      const fecha_inicio = datos.fecha_inicio || new Date().toISOString().split("T")[0];
 
      if (!titulo || titulo.length < 2) {
        return respuesta(
          "No pude recuperar el título. Por favor empieza de nuevo.",
          ["Crear tarea"]
        );
      }
 
      await pool.query(
        `INSERT INTO tarea (titulo, descripcion, fecha_inicio, prioridad, estado)
         VALUES ($1, '', $2, $3, 'pendiente')`,
        [titulo, fecha_inicio, prioridad]
      );
 
      return respuesta(
        `✅ **¡Tarea creada!**\n\n📌 ${titulo}\n📅 ${fecha_inicio}`,
        ["Crear otra tarea", "Ver mis tareas"],
        "inicio",
        "tarea_creada"
      );
    }
 
    // ═══════════════════════════════════════════
    // VER TAREAS
    // ═══════════════════════════════════════════
    if (mensaje.includes("ver mis tareas") || mensaje.includes("mis tareas")) {
      const { rows } = await pool.query(`
        SELECT titulo, prioridad, fecha_inicio, hora_inicio
        FROM tarea
        WHERE deleted_at IS NULL
        ORDER BY fecha_inicio DESC, hora_inicio DESC
        LIMIT 10
      `);
 
      if (rows.length === 0) {
        return respuesta("No tienes tareas aún.", ["Crear tarea"]);
      }
 
      const lista = rows
        .map((t: any) => {
          const prio = t.prioridad === "alta" ? "🔴" : t.prioridad === "media" ? "🟡" : "🔵";
          const fecha = t.fecha_inicio
            ? new Date(t.fecha_inicio).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
            : "Sin fecha";
          const hora = t.hora_inicio ? ` · ${t.hora_inicio}` : "";
          return `${prio} **${t.titulo}**\n   ${fecha}${hora}`;
        })
        .join("\n\n");
 
      return respuesta(`**Tus últimas tareas:**\n\n${lista}`, ["Crear tarea", "Volver al menú"]);
    }
 
    // ═══════════════════════════════════════════
    // RESUMEN
    // ═══════════════════════════════════════════
    if (mensaje.includes("resumen")) {
      const { rows } = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE estado = 'pendiente') AS pendientes,
          COUNT(*) FILTER (WHERE estado = 'completada') AS completadas,
          COUNT(*) FILTER (WHERE fecha_inicio = CURRENT_DATE) AS hoy
        FROM tarea
        WHERE deleted_at IS NULL
      `);
      const r = rows[0];
      return respuesta(
        `📊 **Resumen de tu agenda**\n\n` +
        `📌 Pendientes: **${r.pendientes}**\n` +
        `✅ Completadas: **${r.completadas}**\n` +
        `📅 Para hoy: **${r.hoy}**`,
        ["Ver mis tareas", "Crear tarea"]
      );
    }
 
    // ═══════════════════════════════════════════
    // MENÚ INICIAL / FALLBACK
    // ═══════════════════════════════════════════
    return respuesta(
      "¿Qué deseas hacer?",
      ["Crear tarea", "Ver mis tareas", "Resumen"]
    );
 
  } catch (err: any) {
    console.error("[Chatbot Error]", err);
    return new Response(
      JSON.stringify({ success: false, texto: "❌ Error interno. Inténtalo de nuevo.", opciones: [] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
};