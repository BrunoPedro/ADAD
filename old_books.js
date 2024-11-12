import express from "express";
import db from "../db/config.js";
import { ObjectId } from "mongodb";

const router = express.Router();

// Return the first 50 documents from the movies collection
router.get("/", async (req, res) => {
  try {
    console.log("Fetching movies from the database...");

    const results = await db.collection("books")
      .find({})
      .limit(50)
      .toArray();

    console.log("Movies fetched successfully:", results);

    res.status(200).send(results);
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).send({ error: "Failed to fetch books" });
  }
});

//9


/* router.put("/books/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  try {
    const result = await db.collection("books").updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Livro não encontrado" });
    }

    res.status(200).send({ message: "Livro atualizado com sucesso", result });
  } catch (error) {
    res.status(500).send({ error: "Erro ao atualizar o livro", details: error });
  }
}); */
router.put("/books/:id", async (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
  
    try {
      const result = await db.collection("books").updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedData }
      );
  
      if (result.matchedCount === 0) {
        return res.status(404).send({ message: "Livro não encontrado" });
      }
  
      res.status(200).send({ message: "Livro atualizado com sucesso", result });
    } catch (error) {
      res.status(500).send({ error: "Erro ao atualizar o livro", details: error });
    }
  });


//10
router.put("/users/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  try {
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(id) },
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


//11
router.get("/top/:limit", async (req, res) => {
    const limit = parseInt(req.params.limit);
  
    try {
      const books = await db.collection("books")
        .aggregate([
          { $addFields: { averageScore: { $avg: "$ratings" } } },
          { $sort: { averageScore: -1 } },
          { $limit: limit },
        ])
        .toArray();
  
      res.status(200).send(books);
    } catch (error) {
      res.status(500).send({ error: "Erro ao buscar os melhores livros", details: error });
    }
  });


//12
router.get("/books/ratings/:order", async (req, res) => {
  const order = req.params.order === "asc" ? 1 : -1;

  try {
    const books = await db.collection("books")
      .aggregate([
        {
          $addFields: {
            totalReviews: { $size: "$ratings" },
          },
        },
        { $sort: { totalReviews: order } },
      ])
      .toArray();

    res.status(200).send(books);
  } catch (error) {
    res.status(500).send({ error: "Erro ao ordenar os livros", details: error });
  }
});


//13
router.get("/books/star", async (req, res) => {
  try {
    const books = await db.collection("books")
      .aggregate([
        {
          $addFields: {
            fiveStarReviews: {
              $size: {
                $filter: {
                  input: "$ratings",
                  as: "rating",
                  cond: { $eq: ["$$rating", 5] },
                },
              },
            },
          },
        },
        { $match: { fiveStarReviews: { $gt: 0 } } },
        { $sort: { fiveStarReviews: -1 } },
      ])
      .toArray();

    res.status(200).send(books);
  } catch (error) {
    res.status(500).send({ error: "Erro ao buscar livros com mais 5 estrelas", details: error });
  }
});


//14
router.get("/books/:year", async (req, res) => {
  const year = parseInt(req.params.year);

  try {
    const books = await db.collection("books")
      .find({ year })
      .toArray();

    res.status(200).send(books);
  } catch (error) {
    res.status(500).send({ error: "Erro ao buscar livros do ano", details: error });
  }
});


export default router;

