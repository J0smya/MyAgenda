import pkg from "pg";
const { Pool } = pkg;

const isProduction = process.env.NODE_ENV === "production";

if (!process.env.DATABASE_URL && isProduction) {
  throw new Error("DATABASE_URL no está configurada en producción.");
}

const config = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    }
  : {
      host: "localhost",
      port: 5432,
      user: "admin",
      password: "admin",
      database: "bd_MyAgenda",
    };

export const pool = new Pool(config);

pool.on("error", (err) => {
  console.error("Error inesperado en el pool de PostgreSQL:", err);
});

// Ejecutar migraciones automáticamente al arrancar
pool.connect().then(async (client) => {
  try {
    const migraciones = [
      `ALTER TABLE public.tarea ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) DEFAULT 'personal'`,
      `ALTER TABLE public.tarea ADD COLUMN IF NOT EXISTS id_usuario VARCHAR(50)`,
      `ALTER TABLE public.tarea ADD COLUMN IF NOT EXISTS recordatorio_activo BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE public.tarea ADD COLUMN IF NOT EXISTS recordatorio_minutos INT DEFAULT 60`,
      `ALTER TABLE public.tarea ADD COLUMN IF NOT EXISTS recordatorio_enviado BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE public.tarea ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
    ];
    for (const sql of migraciones) {
      try { await client.query(sql); } catch (_) {}
    }
    console.log("Migraciones verificadas ✅");
  } finally {
    client.release();
  }
}).catch(err => console.error("Error al migrar BD:", err));

export async function verificarConexionDB() {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    console.log("Conectado a la base de datos");

    // Migraciones automáticas de columnas
    const migraciones = [
      `ALTER TABLE public.tarea ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) DEFAULT 'personal'`,
      `ALTER TABLE public.tarea ADD COLUMN IF NOT EXISTS id_usuario VARCHAR(50)`,
      `ALTER TABLE public.tarea ADD COLUMN IF NOT EXISTS recordatorio_activo BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE public.tarea ADD COLUMN IF NOT EXISTS recordatorio_minutos INT DEFAULT 60`,
      `ALTER TABLE public.tarea ADD COLUMN IF NOT EXISTS recordatorio_enviado BOOLEAN DEFAULT FALSE`,
      `ALTER TABLE public.tarea ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ`,
    ];
    for (const sql of migraciones) {
      try { await client.query(sql); } catch (_) {}
    }
    console.log("Migraciones verificadas");
  } finally {
    client.release();
  }
}