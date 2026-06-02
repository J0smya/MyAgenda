import pkg from "pg";
const { Pool } = pkg;

// Configuración directa para conexión local
const config = {
  host: "localhost",
  port: 5432,
  user: "admin",
  password: "admin",
  database: "bd_MyAgenda",
};

export const pool = new Pool(config);

pool.connect()
  .then(() => console.log("Conectado a la base de datos local ✅"))
  .catch(err => console.error("Error al conectar a la base de datos local ❌", err));