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

export async function verificarConexionDB() {
  const client = await pool.connect();

  try {
    await client.query("SELECT 1");
    console.log("Conectado a la base de datos");
  } finally {
    client.release();
  }
}