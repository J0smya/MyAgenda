import pkg from "pg";
const { Pool } = pkg;

// Si existe DATABASE_URL, usa esa (Producción/Render). 
// Si NO existe, usa la configuración local (PC).
const config = process.env.DATABASE_URL 
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : {
      host: "localhost",
      port: 5432,
      user: "admin",
      password: "admin",
      database: "bd_MyAgenda",
    };

export const pool = new Pool(config);

pool.connect()
  .then(() => console.log("Conectado a la base de datos ✅"))
  .catch(err => console.error("Error conexión ❌", err));