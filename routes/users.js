import express from "express";
import db from "../db/config.js";
import { ObjectId } from "mongodb";

const router = express.Router();

// PUT /users/:id - Update a user by ID
router.put("/:id", async (req, res) => {
    const userId = parseInt(req.params.id); 
    const updatedData = req.body;

    try {
      const result = await db.collection("users").updateOne(
        { _id: userId },
        { $set: updatedData }
      );
      if (result.matchedCount === 0) {
        return res.status(404).send({ message: "Usuário não encontrado" });
      }
      res.status(200).send({ message: "Usuário atualizado com sucesso", result });
    } catch (error) {
      res.status(500).send({ error: "Erro ao atualizar o usuário", details: error });
    }
  });
  
export default router;