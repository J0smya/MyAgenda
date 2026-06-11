// src/pages/api/chatbot.ts
export const prerender = false;

import type { APIRoute } from "astro";

function r(texto: string, opciones: string[] = []) {
  return new Response(
    JSON.stringify({ success: true, texto, opciones }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

const AYUDA: Record<string, { texto: string; opciones: string[] }> = {

  inicio: {
    texto: `👋 ¡Hola! Soy **Aria**, tu guía de MyAgenda.\n\n¿Sobre qué te ayudo hoy?`,
    opciones: ["📋 Cómo crear tareas", "📝 Cómo crear notas", "📂 Cómo subir archivos", "🔔 Recordatorios", "🔍 Filtros y categorías", "🤖 Sobre Aria"],
  },

  tareas: {
    texto: `📋 **Crear una tarea** es muy sencillo:\n\n**Paso 1 —** Haz clic en **"+ Nueva tarea"** (esquina superior derecha).\n\n**Paso 2 —** Completa el formulario:\n• **Título** — nombre de la tarea (obligatorio)\n• **Descripción** — notas adicionales (opcional)\n• **Prioridad** — 🔴 Alta · 🟡 Media · 🔵 Baja\n• **Categoría** — elige un filtro del sidebar\n• **Fecha y hora** — cuándo debe ocurrir\n\n**Paso 3 —** Activa **🔔 Activar recordatorio** si quieres una alerta.\n\n**Paso 4 —** Pulsa **"Guardar tarea"**.\n\nLa tarea aparecerá en la vista Día, Semana o Mes según la fecha elegida.`,
    opciones: ["▶️ Ver detalle de una tarea", "🗑️ Eliminar una tarea", "↩️ Volver al inicio"],
  },

  tareas_ver: {
    texto: `🔎 **Ver el detalle de una tarea:**\n\n**Haz clic sobre cualquier tarjeta** de color en el calendario.\n\nSe abrirá un panel con:\n• Título y descripción\n• Fecha y hora\n• Prioridad y categoría\n\nDesde ese panel también puedes **eliminarla** con el botón rojo al fondo.`,
    opciones: ["🗑️ Eliminar una tarea", "📋 Volver a tareas", "↩️ Volver al inicio"],
  },

  tareas_eliminar: {
    texto: `🗑️ **Eliminar una tarea:**\n\n1. Haz clic en la tarjeta de la tarea en el calendario\n2. En el panel emergente, pulsa **"Eliminar tarea"** (texto rojo al fondo)\n3. Confirma en el diálogo\n\n⚠️ Al eliminar una tarea también se eliminan sus notas y archivos asociados.`,
    opciones: ["📋 Volver a tareas", "↩️ Volver al inicio"],
  },

  notas: {
    texto: `📝 **Las notas** tienen dos modos:\n\n**Nota adjunta a tarea:**\nAl crear una tarea, pulsa **"Agregar nota"** en la sección Extras. Se abre el editor enriquecido.\n\n**Nota independiente:**\nHaz clic en **"Notas"** en el sidebar → botón **"+ Nueva nota"**.\n\n¿Cuál quieres aprender?`,
    opciones: ["📌 Nota adjunta a tarea", "🗒️ Nota independiente", "✏️ Editar una nota", "🗑️ Eliminar una nota", "↩️ Volver al inicio"],
  },

  notas_adjunta: {
    texto: `📌 **Nota adjunta a una tarea:**\n\n**Paso 1 —** Abre el formulario de nueva tarea.\n\n**Paso 2 —** Baja a la sección **"Extras"** y pulsa **"Agregar nota"**.\n\n**Paso 3 —** En el editor escribe el contenido y usa la barra de herramientas:\n• **N** Negrita · *I* Cursiva · __S__ Subrayado\n• Listas · Colores de texto\n\n**Paso 4 —** Pulsa **"Guardar nota"**. Verás un badge verde ✓ en el formulario.\n\n**Paso 5 —** Guarda la tarea normalmente.`,
    opciones: ["🗒️ Nota independiente", "📝 Volver a notas", "↩️ Volver al inicio"],
  },

  notas_independiente: {
    texto: `🗒️ **Nota independiente:**\n\n**Paso 1 —** Haz clic en **"Notas"** en el sidebar izquierdo.\n\n**Paso 2 —** Pulsa **"+ Nueva nota"** en el panel.\n\n**Paso 3 —** Escribe el título y el contenido en el editor enriquecido.\n\n**Paso 4 —** Pulsa **"Guardar nota"**.\n\nLa nota aparecerá en la lista con fecha y vista previa. El badge del sidebar muestra el conteo total.`,
    opciones: ["✏️ Editar una nota", "🗑️ Eliminar una nota", "📝 Volver a notas", "↩️ Volver al inicio"],
  },

  notas_editar: {
    texto: `✏️ **Editar una nota:**\n\n**Paso 1 —** Haz clic en **"Notas"** en el sidebar.\n\n**Paso 2 —** Localiza la nota en la lista.\n\n**Paso 3 —** Pulsa el botón **"✏️ Editar"** en la tarjeta.\n\n**Paso 4 —** Modifica el contenido en el editor.\n\n**Paso 5 —** Pulsa **"Guardar nota"**. Verás un toast verde de confirmación.`,
    opciones: ["🗑️ Eliminar una nota", "📝 Volver a notas", "↩️ Volver al inicio"],
  },

  notas_eliminar: {
    texto: `🗑️ **Eliminar una nota:**\n\n**Paso 1 —** Abre el panel de **"Notas"** desde el sidebar.\n\n**Paso 2 —** Localiza la nota en la lista.\n\n**Paso 3 —** Pulsa **"🗑️ Eliminar"** en la tarjeta.\n\n**Paso 4 —** Confirma en el diálogo.\n\n⚠️ Esta acción no se puede deshacer.`,
    opciones: ["📝 Volver a notas", "↩️ Volver al inicio"],
  },

  archivos: {
    texto: `📂 **Los archivos** se adjuntan a tareas y puedes descargarlos cuando los necesites.\n\n¿Qué quieres hacer?`,
    opciones: ["⬆️ Subir un archivo", "⬇️ Descargar un archivo", "🗑️ Eliminar un archivo", "↩️ Volver al inicio"],
  },

  archivos_subir: {
    texto: `⬆️ **Subir un archivo:**\n\n**Paso 1 —** Haz clic en **"Archivos"** en el sidebar.\n\n**Paso 2 —** En la zona de carga puedes:\n• Pulsar **"Seleccionar archivo"** para buscar en tu equipo\n• O **arrastrar y soltar** el archivo sobre la zona punteada\n\n**Paso 3 —** Elige la **tarea** a la que quieres asociar el archivo.\n\n**Paso 4 —** La barra de progreso muestra el avance. Al terminar verás **"¡Subido! ✓"**.\n\n📌 Formatos soportados: imágenes, PDF, Word, Excel, ZIP y más.`,
    opciones: ["⬇️ Descargar un archivo", "🗑️ Eliminar un archivo", "📂 Volver a archivos", "↩️ Volver al inicio"],
  },

  archivos_descargar: {
    texto: `⬇️ **Descargar un archivo:**\n\n**Paso 1 —** Abre **"Archivos"** desde el sidebar.\n\n**Paso 2 —** Localiza el archivo en la lista. Verás nombre, tamaño, tarea asociada y fecha.\n\n**Paso 3 —** Haz clic en **"⬇️ Descargar"** a la derecha de la tarjeta.\n\nEl archivo se descargará directamente a tu equipo.`,
    opciones: ["🗑️ Eliminar un archivo", "📂 Volver a archivos", "↩️ Volver al inicio"],
  },

  archivos_eliminar: {
    texto: `🗑️ **Eliminar un archivo:**\n\n**Paso 1 —** Abre **"Archivos"** desde el sidebar.\n\n**Paso 2 —** Localiza el archivo en la lista.\n\n**Paso 3 —** Pulsa **"🗑️ Eliminar"** en la tarjeta.\n\n**Paso 4 —** Confirma en el diálogo.\n\n⚠️ El archivo se elimina permanentemente del servidor.`,
    opciones: ["📂 Volver a archivos", "↩️ Volver al inicio"],
  },

  recordatorios: {
    texto: `🔔 **Recordatorios:**\n\nMyAgenda te avisa antes de que venza una tarea con una **notificación flotante** en pantalla.\n\n**Cómo activarlo:**\n\n**Paso 1 —** Al crear una tarea, asigna una **fecha y hora** (la hora es obligatoria).\n\n**Paso 2 —** Activa la casilla **"🔔 Activar recordatorio"**.\n\n**Paso 3 —** Elige la antelación:\n• 5 · 15 · 30 minutos antes\n• 1 hora · 2 horas · 1 día antes\n\n**Paso 4 —** Guarda la tarea.\n\nCuando llegue el momento aparecerá la notificación en la esquina inferior derecha. Ciérrala con la **✕**.`,
    opciones: ["📋 Cómo crear tareas", "↩️ Volver al inicio"],
  },

  filtros: {
    texto: `🔍 **Filtros y categorías:**\n\nLos filtros del sidebar organizan y muestran/ocultan tareas por categoría.\n\n**Crear un filtro:**\n1. Haz clic en el **"+"** junto a "Filtros" en el sidebar\n2. Escribe un nombre (ej: Trabajo, Casa, Gym)\n3. Elige un color y un emoji\n4. Pulsa **"Guardar"**\n\n**Activar/desactivar:**\nMarca o desmarca el checkbox del filtro para mostrar u ocultar esas tareas.\n\n**Editar o eliminar:**\nPasa el cursor sobre el filtro para ver los botones ✏️ y 🗑️.\n\n💡 Al crear una tarea, elige la **categoría** en el formulario para asignarla a un filtro.`,
    opciones: ["📋 Cómo crear tareas", "↩️ Volver al inicio"],
  },

  ia: {
    texto: `🤖 **Sobre Aria:**\n\nSoy el asistente de ayuda integrado en MyAgenda. Puedo:\n\n✅ Guiarte **paso a paso** sobre cómo usar la app\n✅ Responder preguntas sobre tareas, notas y archivos\n✅ Explicar cualquier función de la plataforma\n\n**Cómo usarme:**\n• Escribe tu pregunta en el campo de texto\n• O pulsa uno de los botones de respuesta rápida\n\n💡 **Tip:** Escribe **"inicio"** en cualquier momento para volver al menú principal.`,
    opciones: ["📋 Cómo crear tareas", "📝 Cómo crear notas", "📂 Cómo subir archivos", "↩️ Volver al inicio"],
  },
};

function detectarClave(msg: string): string {
  const m = msg.toLowerCase();

  if (["inicio", "menu", "menú", "volver", "hola", "ayuda", "help", "start", "↩️ volver al inicio"].some(w => m.includes(w))) return "inicio";

  if (m.includes("▶️ ver detalle") || m.includes("ver detalle") || m.includes("ver tarea")) return "tareas_ver";
  if (m.includes("🗑️ eliminar una tarea") || (m.includes("eliminar") && m.includes("tarea"))) return "tareas_eliminar";
  if (m.includes("📋 volver a tareas") || m.includes("volver a tareas")) return "tareas";
  if (m.includes("tarea") || m.includes("📋")) return "tareas";

  if (m.includes("📌 nota adjunta") || m.includes("nota adjunta")) return "notas_adjunta";
  if (m.includes("🗒️ nota independiente") || m.includes("nota independiente")) return "notas_independiente";
  if (m.includes("✏️ editar una nota") || m.includes("editar una nota") || (m.includes("editar") && m.includes("nota"))) return "notas_editar";
  if (m.includes("🗑️ eliminar una nota") || (m.includes("eliminar") && m.includes("nota"))) return "notas_eliminar";
  if (m.includes("📝 volver a notas") || m.includes("volver a notas")) return "notas";
  if (m.includes("nota") || m.includes("📝")) return "notas";

  if (m.includes("⬆️ subir") || m.includes("subir")) return "archivos_subir";
  if (m.includes("⬇️ descargar") || m.includes("descargar")) return "archivos_descargar";
  if (m.includes("🗑️ eliminar un archivo") || (m.includes("eliminar") && m.includes("archivo"))) return "archivos_eliminar";
  if (m.includes("📂 volver a archivos") || m.includes("volver a archivos")) return "archivos";
  if (m.includes("archivo") || m.includes("📂")) return "archivos";

  if (m.includes("recordatorio") || m.includes("🔔") || m.includes("alerta") || m.includes("notificacion") || m.includes("notificación")) return "recordatorios";
  if (m.includes("filtro") || m.includes("categoría") || m.includes("categoria") || m.includes("🔍")) return "filtros";
  if (m.includes("aria") || m.includes("🤖 sobre aria") || m.includes("asistente") || m.includes("sobre aria")) return "ia";

  return "inicio";
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const msg  = String(body.mensaje ?? "").trim();
    const clave = detectarClave(msg);
    const nodo  = AYUDA[clave] ?? AYUDA["inicio"];
    return r(nodo.texto, nodo.opciones);
  } catch {
    return new Response(
      JSON.stringify({ success: false, texto: "❌ Error interno. Intenta de nuevo." }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
};