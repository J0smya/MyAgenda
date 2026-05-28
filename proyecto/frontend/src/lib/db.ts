import pkg from "pg";
const { Pool } = pkg;

// Esta variable tomará el valor de DATABASE_URL desde Render
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Requerido para Neon
  },
});

pool.connect()
  .then(() => console.log("Conectado a Neon PostgreSQL ✅"))
  .catch(err => console.error("Error conexión ❌", err));