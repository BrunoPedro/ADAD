import express from "express";
import db from "../db/config.js";
import { ObjectId } from "mongodb";

const router = express.Router();

// Return the first 50 documents from the books collection
router.get("/", async (req, res) => {
  try {
    console.log("Fetching books from the database...");
    const results = await db.collection("books").find({}).limit(50).toArray();
    console.log("Books fetched successfully:", results);
    res.status(200).send(results);
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).send({ error: "Failed to fetch books" });
  }
});

// PUT /books/:id - Update a book by ID
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  // Optional: Validate incoming data
  if (!updatedData || Object.keys(updatedData).length === 0) {
    return res.status(400).send({ message: "No data to update" });
  }

  try {
    // Update the book document in the collection
    const result = await db.collection("books").updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedData }
    );

    // Check if the document was found and updated
    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Livro não encontrado" });
    }

    // Send success response
    res.status(200).send({ message: "Livro atualizado com sucesso", result });
  } catch (error) {
    console.error("Error updating book:", error); // Log the error for debugging purposes
    res.status(500).send({ error: "Erro ao atualizar o livro", details: error });
  }
});

// PUT /users/:id - Update a user by ID
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

// GET /books/top/:limit - Get top books by average score
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

//Get reviews order
router.get("/reviews", async (req, res) => {
    const order = req.query.order === "asc" ? 1 : -1; // Ascending if "asc", descending otherwise
    try {
      const pipeline = [
        // Unwind the reviews array to get each review as a separate document
        { $unwind: "$reviews" },
        // Group by book_id and count the number of reviews for each book
        {
          $group: {
            _id: "$reviews.book_id", // Group by book_id from reviews
            reviewCount: { $sum: 1 }
          }
        },
        // Join with the books collection to get book details
        {
          $lookup: {
            from: "books",
            localField: "_id",
            foreignField: "_id",
            as: "bookDetails"
          }
        },
        // Flatten the bookDetails array
        { $unwind: "$bookDetails" },
        // Sort the results by reviewCount in the specified order
        { $sort: { reviewCount: order } },
        // Optional: Project fields if you want a cleaner result
        {
          $project: {
            _id: 0,
            bookId: "$_id",
            reviewCount: 1,
            bookDetails: 1
          }
        }
      ];
  
      // Execute the aggregation on the users collection
      const books = await db.collection("users").aggregate(pipeline).toArray();
      res.status(200).send(books);
    } catch (error) {
      console.error("Error fetching books by review count:", error);
      res.status(500).send({ error: "Failed to fetch books by review count", details: error });
    }
  });
  

// GET /books/star - Get books with the most 5-star ratings
router.get("/star", async (req, res) => {
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

// GET /books/year/:year - Get books by a specific year
router.get("/year/:year", async (req, res) => {
  const year = parseInt(req.params.year);
  try {
    const books = await db.collection("books").find({ year }).toArray();
    res.status(200).send(books);
  } catch (error) {
    res.status(500).send({ error: "Erro ao buscar livros do ano", details: error });
  }
});

export default router;
