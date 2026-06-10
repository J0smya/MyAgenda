export const prerender = false;

import type { APIRoute } from "astro";
import { pool } from "../../lib/db";

interface EstadoChat {
  menu: string;
  datos?: Record<string, any>;
}

function respuesta(texto: string, opciones?: string[], estado?: string, accion?: string) {
  return new Response(
    JSON.stringify({
      success: true,
      texto,
      opciones: opciones ?? [],
      estado: estado ?? "inicio",
      accion: accion ?? null,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

function errorResp(msg: string) {
  return new Response(
    JSON.stringify({ success: false, texto: msg, opciones: [], estado: "inicio", accion: null }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

function menuPrincipal() {
  return respuesta(
    "Hola! Soy Aria, tu asistente. Que deseas hacer?",
    ["Ver mis tareas", "Crear tarea", "Ver mis notas", "Crear nota", "Ver archivos", "Ver etiquetas", "Crear etiqueta", "Resumen general"],
    "inicio"
  );
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const mensajeOriginal: string = (body.mensaje ?? "").trim();
    const mensaje = mensajeOriginal.toLowerCase();
    const estado: EstadoChat = body.estado ?? { menu: "inicio" };
    const datos: Record<string, any> = body.datos ?? {};
    const menu = estado.menu;

    // Volver al menu - siempre prioridad maxima
    if (
      mensaje === "inicio" ||
      mensaje === "menu" ||
      mensaje === "volver" ||
      mensaje.includes("volver al menu") ||
      mensaje.includes("volver al men")
    ) {
      return menuPrincipal();
    }

    // =====================
    // MENU INICIO
    // =====================
    if (menu === "inicio") {

      // Ver tareas
      if (mensaje.includes("ver mis tareas")) {
        const result = await pool.query(
          `SELECT titulo, prioridad, estado, fecha_inicio FROM public.tarea ORDER BY fecha_creacion DESC LIMIT 10`
        );
        if (result.rows.length === 0) {
          return respuesta(
            "No tienes tareas creadas aun. Que deseas hacer?",
            ["Crear tarea", "Volver al menu"],
            "inicio"
          );
        }
        const lista = result.rows
          .map((t: any, i: number) => {
            const emoji =
              t.prioridad === "alta" ? "[Alta]" : t.prioridad === "media" ? "[Media]" : "[Baja]";
            const fecha = t.fecha_inicio
              ? ` - ${new Date(t.fecha_inicio).toLocaleDateString("es-ES")}`
              : "";
            return `${i + 1}. ${emoji} ${t.titulo}${fecha} - ${t.estado}`;
          })
          .join("\n");
        return respuesta(
          `Tus tareas (${result.rows.length}):\n\n${lista}\n\nQue deseas hacer?`,
          ["Crear tarea", "Resumen general", "Volver al menu"],
          "inicio"
        );
      }

      // Crear tarea - paso 1
      if (mensaje.includes("crear tarea")) {
        return respuesta(
          "Vamos a crear una tarea.\n\nCual es el titulo de la tarea?",
          [],
          "crear_tarea_titulo"
        );
      }

      // Ver notas
      if (mensaje.includes("ver mis notas")) {
        const result = await pool.query(
          `SELECT n.nota_titulo, n.fecha_creacion, t.titulo AS tarea_titulo
           FROM public.nota n
           LEFT JOIN public.tarea t ON t.id_tarea = n.id_tarea
           WHERE n.deleted_at IS NULL
           ORDER BY n.fecha_creacion DESC LIMIT 10`
        );
        if (result.rows.length === 0) {
          return respuesta(
            "No tienes notas creadas aun. Que deseas hacer?",
            ["Crear nota", "Volver al menu"],
            "inicio"
          );
        }
        const lista = result.rows
          .map((n: any, i: number) => {
            const tarea = n.tarea_titulo ? ` - Tarea: ${n.tarea_titulo}` : "";
            const fecha = new Date(n.fecha_creacion).toLocaleDateString("es-ES");
            return `${i + 1}. ${n.nota_titulo}${tarea} - ${fecha}`;
          })
          .join("\n");
        return respuesta(
          `Tus notas (${result.rows.length}):\n\n${lista}\n\nQue deseas hacer?`,
          ["Crear nota", "Volver al menu"],
          "inicio"
        );
      }

      // Crear nota - paso 1
      if (mensaje.includes("crear nota")) {
        return respuesta(
          "Vamos a crear una nota.\n\nCual es el titulo de la nota?",
          [],
          "crear_nota_titulo"
        );
      }

      // Ver archivos
      if (mensaje.includes("ver archivos")) {
        const result = await pool.query(
          `SELECT a.nombre, a.tamano, a.fecha_subida, t.titulo AS tarea_titulo
           FROM public.archivo a
           LEFT JOIN public.tarea t ON t.id_tarea = a.id_tarea
           WHERE a.deleted_at IS NULL
           ORDER BY a.fecha_subida DESC LIMIT 10`
        );
        if (result.rows.length === 0) {
          return respuesta(
            "No tienes archivos subidos aun. Que deseas hacer?",
            ["Volver al menu"],
            "inicio"
          );
        }
        const lista = result.rows
          .map((a: any, i: number) => {
            const kb = a.tamano ? `${(a.tamano / 1024).toFixed(1)} KB` : "";
            const tarea = a.tarea_titulo ? ` - Tarea: ${a.tarea_titulo}` : "";
            return `${i + 1}. ${a.nombre} ${kb}${tarea}`;
          })
          .join("\n");
        return respuesta(
          `Tus archivos (${result.rows.length}):\n\n${lista}\n\nQue deseas hacer?`,
          ["Volver al menu"],
          "inicio"
        );
      }

      // Ver etiquetas
      if (mensaje.includes("ver etiquetas")) {
        const result = await pool.query(
          `SELECT id_etiqueta, nombre, color FROM public.etiqueta ORDER BY nombre ASC LIMIT 20`
        );
        if (result.rows.length === 0) {
          return respuesta(
            "No tienes etiquetas creadas aun. Que deseas hacer?",
            ["Crear etiqueta", "Volver al menu"],
            "inicio"
          );
        }
        const lista = result.rows
          .map((e: any, i: number) => `${i + 1}. ${e.nombre} (${e.color})`)
          .join("\n");
        return respuesta(
          `Tus etiquetas (${result.rows.length}):\n\n${lista}\n\nQue deseas hacer?`,
          ["Crear etiqueta", "Volver al menu"],
          "inicio"
        );
      }

      // Crear etiqueta - paso 1
      if (mensaje.includes("crear etiqueta")) {
        return respuesta(
          "Vamos a crear una etiqueta.\n\nCual es el nombre de la etiqueta?",
          [],
          "crear_etiqueta_nombre"
        );
      }

      // Resumen general
      if (mensaje.includes("resumen")) {
        const [t, n, a] = await Promise.all([
          pool.query(
            `SELECT COUNT(*) AS total,
              SUM(CASE WHEN prioridad='alta' THEN 1 ELSE 0 END) AS alta,
              SUM(CASE WHEN estado='pendiente' THEN 1 ELSE 0 END) AS pendientes
             FROM public.tarea`
          ),
          pool.query(`SELECT COUNT(*) AS total FROM public.nota WHERE deleted_at IS NULL`),
          pool.query(`SELECT COUNT(*) AS total FROM public.archivo WHERE deleted_at IS NULL`),
        ]);
        const tareas = t.rows[0];
        return respuesta(
          `Resumen de tu agenda:\n\n` +
            `Tareas totales: ${tareas.total}\n` +
            `Prioridad alta: ${tareas.alta ?? 0}\n` +
            `Pendientes: ${tareas.pendientes ?? 0}\n` +
            `Notas: ${n.rows[0].total}\n` +
            `Archivos: ${a.rows[0].total}\n\n` +
            `Que deseas hacer?`,
          ["Ver mis tareas", "Ver mis notas", "Volver al menu"],
          "inicio"
        );
      }

      // Fallback menu inicio
      return menuPrincipal();
    }

    // =====================
    // FLUJO CREAR TAREA
    // =====================

    // Paso 2: recibir titulo, pedir prioridad
    if (menu === "crear_tarea_titulo") {
      if (!mensajeOriginal || mensajeOriginal.length < 2) {
        return respuesta(
          "Por favor escribe un titulo valido para la tarea.",
          [],
          "crear_tarea_titulo"
        );
      }
      return respuesta(
        `Titulo: "${mensajeOriginal}"\n\nCual es la prioridad?`,
        ["Alta", "Media", "Baja"],
        "crear_tarea_prioridad"
      );
    }

    // Paso 3: recibir prioridad, pedir categoria
    if (menu === "crear_tarea_prioridad") {
      let prioridad = "media";
      if (mensaje.includes("alta")) prioridad = "alta";
      else if (mensaje.includes("baja")) prioridad = "baja";
      return respuesta(
        `Prioridad: ${prioridad}\n\nA que categoria pertenece?`,
        ["Trabajo", "Personal"],
        "crear_tarea_categoria"
      );
    }

    // Paso 4: recibir categoria, pedir fecha
    if (menu === "crear_tarea_categoria") {
      let categoria = "personal";
      if (mensaje.includes("trabajo")) categoria = "trabajo";
      return respuesta(
        `Categoria: ${categoria}\n\nSelecciona la fecha para la tarea:`,
        ["Hoy", "Manana", "Elegir fecha"],
        "crear_tarea_fecha"
      );
    }

    // Paso 4b: el usuario eligio "Elegir fecha", pedir que la escriba
    if (menu === "crear_tarea_fecha" && (mensaje.includes("elegir fecha") || mensaje.includes("elegir"))) {
      return respuesta(
        "Escribe la fecha en formato DD/MM/AAAA:",
        [],
        "crear_tarea_fecha_manual"
      );
    }

    // Paso 5a: fecha manual escrita por el usuario
    if (menu === "crear_tarea_fecha_manual") {
      const titulo    = datos.titulo    ?? "Tarea sin titulo";
      const prioridad = datos.prioridad ?? "media";
      const categoria = datos.categoria ?? "personal";

      let fecha: string | null = null;
      const partes = mensajeOriginal.trim().split("/");
      if (partes.length === 3) {
        fecha = `${partes[2]}-${partes[1].padStart(2, "0")}-${partes[0].padStart(2, "0")}`;
      }

      if (!fecha) {
        return respuesta(
          "Formato incorrecto. Escribe la fecha como DD/MM/AAAA (ejemplo: 15/06/2025):",
          [],
          "crear_tarea_fecha_manual"
        );
      }

      try {
        await pool.query(
          `INSERT INTO public.tarea
             (titulo, descripcion, fecha_inicio, hora_inicio, prioridad, categoria, estado, fecha_creacion)
           VALUES ($1, '', $2, NULL, $3, $4, 'pendiente', NOW())`,
          [titulo, fecha, prioridad, categoria]
        );
        return respuesta(
          `Tarea "${titulo}" creada correctamente!\n\nPrioridad: ${prioridad}\nCategoria: ${categoria}\nFecha: ${fecha}\n\nQue deseas hacer ahora?`,
          ["Ver mis tareas", "Crear otra tarea", "Volver al menu"],
          "inicio",
          "tarea_creada"
        );
      } catch (e: any) {
        console.error("[chatbot] Error creando tarea:", e.message);
        return errorResp("Hubo un error al guardar la tarea. Intenta de nuevo.");
      }
    }

    // Paso 5b: fecha rapida (Hoy o Manana)
    if (menu === "crear_tarea_fecha") {
      const titulo    = datos.titulo    ?? "Tarea sin titulo";
      const prioridad = datos.prioridad ?? "media";
      const categoria = datos.categoria ?? "personal";

      let fecha: string | null = null;
      const hoy = new Date();

      if (mensaje.includes("hoy")) {
        fecha = hoy.toISOString().split("T")[0];
      } else if (mensaje.includes("man")) {
        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);
        fecha = manana.toISOString().split("T")[0];
      } else {
        // Intentar parsear DD/MM/AAAA si escribio directamente
        const partes = mensajeOriginal.trim().split("/");
        if (partes.length === 3) {
          fecha = `${partes[2]}-${partes[1].padStart(2, "0")}-${partes[0].padStart(2, "0")}`;
        }
      }

      try {
        await pool.query(
          `INSERT INTO public.tarea
             (titulo, descripcion, fecha_inicio, hora_inicio, prioridad, categoria, estado, fecha_creacion)
           VALUES ($1, '', $2, NULL, $3, $4, 'pendiente', NOW())`,
          [titulo, fecha, prioridad, categoria]
        );
        return respuesta(
          `Tarea "${titulo}" creada correctamente!\n\nPrioridad: ${prioridad}\nCategoria: ${categoria}${fecha ? `\nFecha: ${fecha}` : ""}\n\nQue deseas hacer ahora?`,
          ["Ver mis tareas", "Crear otra tarea", "Volver al menu"],
          "inicio",
          "tarea_creada"
        );
      } catch (e: any) {
        console.error("[chatbot] Error creando tarea:", e.message);
        return errorResp("Hubo un error al guardar la tarea. Intenta de nuevo.");
      }
    }

    // =====================
    // FLUJO CREAR NOTA
    // =====================

    // Paso 2: recibir titulo, pedir contenido
    if (menu === "crear_nota_titulo") {
      if (!mensajeOriginal || mensajeOriginal.length < 2) {
        return respuesta(
          "Por favor escribe un titulo valido para la nota.",
          [],
          "crear_nota_titulo"
        );
      }
      return respuesta(
        `Titulo: "${mensajeOriginal}"\n\nAhora escribe el contenido de la nota:`,
        [],
        "crear_nota_contenido"
      );
    }

    // Paso 3: recibir contenido, guardar nota
    if (menu === "crear_nota_contenido") {
      const titulo    = datos.titulo ?? "Nota sin titulo";
      const contenido = mensajeOriginal.trim();
      if (!contenido || contenido.length < 2) {
        return respuesta(
          "Por favor escribe un contenido valido para la nota.",
          [],
          "crear_nota_contenido"
        );
      }
      try {
        await pool.query(
          `INSERT INTO public.nota (id_nota, nota_titulo, contenido, fecha_creacion)
           VALUES (gen_random_uuid(), $1, $2, NOW())`,
          [titulo, contenido]
        );
        return respuesta(
          `Nota "${titulo}" creada correctamente!\n\nQue deseas hacer ahora?`,
          ["Ver mis notas", "Crear otra nota", "Volver al menu"],
          "inicio",
          "nota_creada"
        );
      } catch (e: any) {
        console.error("[chatbot] Error creando nota:", e.message);
        return errorResp("Hubo un error al guardar la nota. Intenta de nuevo.");
      }
    }

    // =====================
    // FLUJO CREAR ETIQUETA
    // =====================

    // Paso 2: recibir nombre, pedir color
    if (menu === "crear_etiqueta_nombre") {
      if (!mensajeOriginal || mensajeOriginal.length < 2) {
        return respuesta(
          "Por favor escribe un nombre valido para la etiqueta.",
          [],
          "crear_etiqueta_nombre"
        );
      }
      return respuesta(
        `Nombre: "${mensajeOriginal}"\n\nElige un color para la etiqueta:`,
        ["#0ea5e9 Azul", "#10b981 Verde", "#ef4444 Rojo", "#f59e0b Amarillo", "#8b5cf6 Morado", "#f97316 Naranja"],
        "crear_etiqueta_color"
      );
    }

    // Paso 3: recibir color, guardar etiqueta
    if (menu === "crear_etiqueta_color") {
      const nombre = datos.titulo ?? "Etiqueta sin nombre";
      // Extraer el codigo hex del mensaje
      let color = "#0ea5e9";
      const hexMatch = mensajeOriginal.match(/#[0-9a-fA-F]{6}/);
      if (hexMatch) color = hexMatch[0];

      try {
        await pool.query(
          `INSERT INTO public.etiqueta (id_etiqueta, nombre, color)
           VALUES (gen_random_uuid(), $1, $2)`,
          [nombre, color]
        );
        return respuesta(
          `Etiqueta "${nombre}" creada con color ${color}.\n\nQue deseas hacer ahora?`,
          ["Ver etiquetas", "Crear otra etiqueta", "Volver al menu"],
          "inicio",
          "etiqueta_creada"
        );
      } catch (e: any) {
        console.error("[chatbot] Error creando etiqueta:", e.message);
        return errorResp("Hubo un error al guardar la etiqueta. Intenta de nuevo.");
      }
    }

    // FALLBACK GLOBAL
    return menuPrincipal();

  } catch (err: any) {
    console.error("[POST /api/chatbot]", err.message);
    return new Response(
      JSON.stringify({
        success: false,
        texto: "Error interno. Intenta de nuevo.",
        opciones: [],
        estado: "inicio",
        accion: null,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};