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

<<<<<<< HEAD
pool.on("error", (err) => {
  console.error("Error inesperado en el pool de PostgreSQL:", err);
});

export async function verificarConexionDB() {
  const client = await pool.connect();

  try {
    await client.query("SELECT 1");
    console.log("Conectado a la base de datos");
  } finally {
    client.release();
  }
}
=======
pool.connect()
  .then(async (client) => {
    console.log("Conectado a la base de datos ✅");
    try {
      await client.query(`ALTER TABLE public.tarea ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) DEFAULT 'personal'`);
      await client.query(`ALTER TABLE public.tarea ADD COLUMN IF NOT EXISTS id_usuario INT`);
      await client.query(`ALTER TABLE public.tarea ADD COLUMN IF NOT EXISTS recordatorio_enviado BOOLEAN DEFAULT FALSE`);
      console.log("Columnas verificadas ✅");
    } catch (_) {}
    client.release();
  })
  .catch(err => console.error("Error al conectar a la base de datos ❌", err));
>>>>>>> 485c5bbf6070020ed7b61aa8b4e740d4419ba513
