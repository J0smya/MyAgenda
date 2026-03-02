import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "admin",
  password: "admin",
  database: "bd_MyAgenda",
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
