import type { APIRoute } from 'astro';
import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';

// Configuración de la conexión a PostgreSQL (Ajusta con tus credenciales reales)
const pool = new pg.Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'my_agenda_db', // Asegúrate de que este sea el nombre de tu BD en pgAdmin
  password: 'tu_contraseña',
  port: 5432,
});

// Asumiremos un ID de usuario fijo para el entorno local (por ejemplo, el usuario 1)
const USUARIO_ID = 1;

/* ==============================================================
   1. OBTENER PERFIL (GET /api/perfil)
   ============================================================== */
export const GET: APIRoute = async () => {
  try {
    // Consulta los datos actuales del usuario en PostgreSQL
    const resultado = await pool.query(
      'SELECT nombre, foto_url FROM usuarios WHERE id_usuario = $1',
      [USUARIO_ID]
    );

    if (resultado.rows.length === 0) {
      return new Response(JSON.stringify({ success: false, message: 'Usuario no encontrado' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      perfil: {
        nombre: resultado.rows[0].nombre,
        foto_url: resultado.rows[0].foto_url || '/tu-foto.jpg' // Imagen por defecto si es nula
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error en GET /api/perfil:', error);
    return new Response(JSON.stringify({ success: false, error: 'Error interno del servidor' }), {
      status: 500,
    });
  }
};

/* ==============================================================
   2. ACTUALIZAR PERFIL (POST /api/perfil)
   ============================================================== */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Leemos los datos enviados mediante FormData
    const formData = await request.formData();
    const nombre = formData.get('nombre') as string | null;
    const foto = formData.get('foto') as File | null;

    if (!nombre) {
      return new Response(JSON.stringify({ success: false, message: 'El nombre es obligatorio' }), {
        status: 400,
      });
    }

    let fotoUrl: string | null = null;

    // Si el usuario subió una nueva imagen, la procesamos y guardamos en el servidor
    if (foto && foto.size > 0 && foto.name !== 'undefined') {
      // Definimos la ruta de la carpeta de subidas: public/uploads/
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      
      // Aseguramos que la carpeta exista, si no, la crea automáticamente
      await fs.mkdir(uploadsDir, { recursive: true });

      // Creamos un nombre de archivo único usando la marca de tiempo para evitar duplicados
      const extension = path.extname(foto.name) || '.jpg';
      const nombreArchivo = `perfil_${USUARIO_ID}_${Date.now()}${extension}`;
      const rutaCompleta = path.join(uploadsDir, nombreArchivo);

      // Convertimos el archivo a un Buffer binario y lo escribimos en el disco duro
      const bytes = await foto.arrayBuffer();
      const buffer = Buffer.from(bytes);
      await fs.writeFile(rutaCompleta, buffer);

      // Esta es la URL relativa pública que el navegador usará para renderizar la foto
      fotoUrl = `/uploads/${nombreArchivo}`;
    }

    // Ejecutamos la actualización en la base de datos de pgAdmin
    if (fotoUrl) {
      // Si cambió de foto, actualizamos nombre e imagen
      await pool.query(
        'UPDATE usuarios SET nombre = $1, foto_url = $2 WHERE id_usuario = $3',
        [nombre, fotoUrl, USUARIO_ID]
      );
    } else {
      // Si no subió foto, solo actualizamos el nombre para no borrar la foto anterior
      await pool.query(
        'UPDATE usuarios SET nombre = $1 WHERE id_usuario = $2',
        [nombre, USUARIO_ID]
      );
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Perfil actualizado correctamente en la base de datos',
      foto_url: fotoUrl // Devolvemos la nueva URL para actualizar el frontend al instante
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error en POST /api/perfil:', error);
    return new Response(JSON.stringify({ success: false, error: 'Error al guardar los datos' }), {
      status: 500,
    });
  }
};