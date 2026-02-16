import { Router } from "express";
import prisma from "../db/prisma.js";
const router = Router();
router.get("/", async (req, res) => {
 const todos = await prisma.todo.findMany();
 res.json(todos);
});
export default router;
