import express from "express";
import db from "../db/config.js";
import { ObjectId } from "mongodb";

const router = express.Router();

// GET /books
router.get("/", async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  try {
    console.log(`Fetching books from the database... Page ${page}`);

    const count = await db.collection("books").countDocuments();

    const results = await db.collection("books")
      .find({})
      .skip(skip)
      .limit(pageSize)
      .toArray();

    const totalPages = Math.ceil(count / pageSize);
    const nextPage = page < totalPages ? `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}?page=${page + 1}` : null;
    const prevPage = page > 1 ? `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}?page=${page - 1}` : null;

    const response = {
      info: {
        count,
        pages: totalPages,
        next: nextPage,
        prev: prevPage,
      },
      results,
    };

    console.log("Books fetched successfully:", results);
    res.status(200).send(response);
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).send({ error: "Failed to fetch books" });
  }
});

// PUT /books/:id
router.put("/:id", async (req, res) => {
  const libraryId = parseInt(req.params.id);
  const updatedData = req.body;

  if (!updatedData || Object.keys(updatedData).length === 0) {
    return res.status(400).send({ message: "Sem dados para atualizar" });
  }

  try {
    const result = await db.collection("books").updateOne(
      { _id: libraryId },
      { $set: updatedData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Livro não encontrado" });
    }

    res.status(200).send({ message: "Livro atualizado com sucesso", result });
  } catch (error) {
    console.error("Erro ao atualizar o livro:", error);
    res.status(500).send({ error: "Erro ao atualizar o livro", details: error });
  }
});

// GET /books/top/:limit 
router.get("/top/:limit", async (req, res) => {
  const limit = parseInt(req.params.limit);
  const page = parseInt(req.query.page) || 1;  
  const pageSize = 20;  
  const skip = (page - 1) * pageSize;  
  
  try {
    const pipeline = [
      { $addFields: { averageScore: { $avg: "$ratings" } } },  
      { $sort: { averageScore: -1 } },  
    ];

    if (limit > 20) {
      pipeline.push({ $skip: skip });  
      pipeline.push({ $limit: pageSize });  
    } else {
      pipeline.push({ $limit: limit });
    }

    const books = await db.collection("books").aggregate(pipeline).toArray();

    if (limit > 20) {
      const totalBooks = await db.collection("books").countDocuments();
      const totalPages = Math.ceil(totalBooks / pageSize);

      const nextPage = page < totalPages ? `${req.protocol}://${req.get('host')}/books/top/${limit}?page=${page + 1}` : null;
      const prevPage = page > 1 ? `${req.protocol}://${req.get('host')}/books/top/${limit}?page=${page - 1}` : null;

      const response = {
        info: {
          count: totalBooks,
          pages: totalPages,
          next: nextPage,
          prev: prevPage,
        },
        results: books,
      };

      res.status(200).send(response);
    } else {
      res.status(200).send({ results: books });
    }
  } catch (error) {
    console.error("Erro ao buscar os melhores livros:", error);
    res.status(500).send({ error: "Erro ao buscar os melhores livros", details: error });
  }
});



// GET /books/ratings/:order
router.get("/ratings/:order", async (req, res) => {
  const { order } = req.params;

  if (order !== "asc" && order !== "desc") {
    return res.status(400).send({ message: "Parametros inválidos. Use 'asc' or 'desc'." });
  }

  const sortOrder = order === "asc" ? 1 : -1;

  try {
    const pipeline = [
      { $unwind: "$reviews" },
      {
        $group: {
          _id: "$reviews.book_id",
          reviewCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "books",
          localField: "_id",
          foreignField: "_id",
          as: "bookDetails",
        },
      },
      { $unwind: "$bookDetails" },
      { $sort: { reviewCount: sortOrder } },
      {
        $project: {
          _id: 0,
          bookId: "$_id",
          reviewCount: 1,
          bookDetails: 1,
        },
      },
    ];

    const books = await db.collection("users").aggregate(pipeline).toArray();
    res.status(200).send(books);
  } catch (error) {
    console.error("Erro ao buscar livros ordenados por reviews:", error);
    res.status(500).send({ error: "Erro ao buscar livros ordenados por reviews", details: error });
  }
});

// GET /books/star
router.get("/star", async (req, res) => {
  const page = parseInt(req.query.page) || 1;  
  const pageSize = 20;  
  const skip = (page - 1) * pageSize;  

  try {
    const pipeline = [
      { $unwind: "$reviews" },
      { $match: { "reviews.score": 5 } },
      {
        $group: {
          _id: "$reviews.book_id",
          fiveStarReviews: { $sum: 1 },
        },
      },
      { $match: { fiveStarReviews: { $gt: 5 } } },
      {
        $lookup: {
          from: "books",
          localField: "_id",
          foreignField: "_id",
          as: "bookDetails",
        },
      },
      { $unwind: "$bookDetails" },
      {
        $project: {
          _id: 0,
          bookId: "$_id",
          fiveStarReviews: 1,
          bookDetails: 1,
        },
      },
      { $sort: { fiveStarReviews: -1 } },  
      { $skip: skip },  
      { $limit: pageSize },  
    ];

    const books = await db.collection("users").aggregate(pipeline).toArray();

    const totalBooks = await db.collection("users")
      .aggregate([
        { $unwind: "$reviews" },
        { $match: { "reviews.score": 5 } },
        {
          $group: {
            _id: "$reviews.book_id",
            fiveStarReviews: { $sum: 1 },
          },
        },
        { $match: { fiveStarReviews: { $gt: 5 } } },
      ])
      .toArray();
    const totalPages = Math.ceil(totalBooks.length / pageSize);

    const nextPage = page < totalPages ? `${req.protocol}://${req.get('host')}/books/star?page=${page + 1}` : null;
    const prevPage = page > 1 ? `${req.protocol}://${req.get('host')}/books/star?page=${page - 1}` : null;

    const response = {
      info: {
        count: totalBooks.length,
        pages: totalPages,
        next: nextPage,
        prev: prevPage,
      },
      results: books,
    };

    res.status(200).send(response);
  } catch (error) {
    console.error("Erro ao buscar livros com reviews com mais de 5 estrelas:", error);
    res.status(500).send({
      error: "Falha ao buscar livros com reviews com mais de 5 estrelas",
      details: error,
    });
  }
});


// GET /books/year/:year - Get books by a specific year
router.get("/year/:year", async (req, res) => {
  const year = parseInt(req.params.year);

  try {
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);

    const books = await db.collection("books").find({
      publishedDate: { $gte: startOfYear, $lt: endOfYear }
    }).toArray();

    res.status(200).send(books);
  } catch (error) {
    res.status(500).send({ error: "Erro ao buscar livros do ano especificado", details: error });
  }
});

export default router;
