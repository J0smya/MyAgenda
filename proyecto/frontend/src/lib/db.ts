import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.connect()
  .then(() => console.log("Conectado a PostgreSQL ✅"))
  .catch(err => console.error("Error conexión ❌", err));

type User = {
  id: string;
  name: string;
  email: string;
  password: string;
};