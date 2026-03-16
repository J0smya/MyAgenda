import pkg from "pg";
const { Pool } = pkg;

// Configuracion de conexion a tu base de datos bd_MyAgenda
// Estos datos deben coincidir con tu instalacion local de Postgres
export const pool = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "Sena1234",
  database: "bd_MyAgenda",
});

// Prueba de conexion inicial
pool.connect()
  .then(() => console.log("Conectado a PostgreSQL ✅ (bd_MyAgenda)"))
  .catch(err => console.error("Error conexion ❌", err));

// Definicion de tipos para que Visual Studio Code no te de errores de subrayado
export interface Tarea {
  id_tarea?: number;
  titulo: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_vencimiento?: string;
  hora_inicio: string | null;
  hora_fin?: string | null;
  fecha_creacion?: Date;
  estado: string;
  prioridad: string;
  id_proyecto?: number;
  fecha_desactiva?: string;
  razon_desactiva?: string;
  delete_at?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}