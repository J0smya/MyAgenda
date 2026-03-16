import { Router } from "express";
import prisma from "../db/prisma.js";

const router = Router();

router.get("/", async (req, res) => {
 const todos = await prisma.todo.findMany();
 res.json(todos);
});

router.post("/", async (req, res) => {
 try {

  const { titulo, descripcion, etiquetas } = req.body;

  const nuevaTarea = await prisma.todo.create({
   data: {
    titulo,
    descripcion,
    etiquetas
   }
  });

  res.json(nuevaTarea);

 } catch (error) {
  res.status(500).json({ error: error.message });
 }
});

export default router;