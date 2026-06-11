import pkg from "pg";
const { Pool } = pkg;

// VALIDACIÓN: Si no hay DATABASE_URL en Render, el servidor te avisará de inmediato.
if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
  console.error("ERROR CRÍTICO: La variable DATABASE_URL no está configurada en el entorno.");
}

// Configuración dinámica
// Si estamos en producción (Render), usamos DATABASE_URL. Si no, usamos la local.
const config = process.env.DATABASE_URL 
  ? { 
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false } // NECESARIO para conexiones externas como Neon/Postgres remoto
    }
  : {
      host: "localhost",
      port: 5432,
      user: "admin",
      password: "admin",
      database: "bd_MyAgenda",
    };

export const pool = new Pool(config);

pool.connect()
  .then(async (client) => {
    console.log("Conectado a la base de datos ✅");
    try {
      await client.query(`
        ALTER TABLE public.tarea
        ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) DEFAULT 'personal'
      `);
      console.log("Columna 'categoria' verificada ✅");
    } catch (_) {
      // Si la tabla aún no existe, se ignora el error
    }
    client.release();
  })
  .catch(err => console.error("Error al conectar a la base de datos ❌", err));