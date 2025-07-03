import { PrismaClient } from "@prisma/client";
import express from "express";

const testRouter = express();
const db = new PrismaClient();

testRouter.get("/", (req, res) => {
  res.status(200).json({ message: "Test route is working!" });
});

testRouter.get("/db", async (req, res) => {
  try {
    const query = db.$queryRaw`SELECT * FROM "User"`;
    const users = await query;
    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default testRouter;
