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
  // Parse and rename the ID parameter
  const libraryId = parseInt(req.params.id); 
  const updatedData = req.body;

  // Optional: Validate incoming data
  if (!updatedData || Object.keys(updatedData).length === 0) {
    return res.status(400).send({ message: "No data to update" });
  }

  try {
    // Update the book document in the collection
    const result = await db.collection("books").updateOne(
      { _id: libraryId }, // Match by the parsed integer ID
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



// Get reviews order by ascending or descending
router.get("/ratings/:order", async (req, res) => {
  const { order } = req.params;

  // Validate the order parameter
  if (order !== "asc" && order !== "desc") {
    return res.status(400).send({ message: "Invalid order parameter. Use 'asc' or 'desc'." });
  }

  const sortOrder = order === "asc" ? 1 : -1; // Convert 'asc' or 'desc' to MongoDB sort order

  try {
    const pipeline = [
      // Unwind the reviews array to get each review as a separate document
      { $unwind: "$reviews" },
      // Group by book_id and count the number of reviews for each book
      {
        $group: {
          _id: "$reviews.book_id", // Group by book_id from reviews
          reviewCount: { $sum: 1 },
        },
      },
      // Join with the books collection to get book details
      {
        $lookup: {
          from: "books",
          localField: "_id",
          foreignField: "_id",
          as: "bookDetails",
        },
      },
      // Flatten the bookDetails array
      { $unwind: "$bookDetails" },
      // Sort the results by reviewCount in the specified order
      { $sort: { reviewCount: sortOrder } },
      // Optional: Project fields if you want a cleaner result
      {
        $project: {
          _id: 0,
          bookId: "$_id",
          reviewCount: 1,
          bookDetails: 1,
        },
      },
    ];

    // Execute the aggregation on the users collection
    const books = await db.collection("users").aggregate(pipeline).toArray();
    res.status(200).send(books);
  } catch (error) {
    console.error("Error fetching books by review count:", error);
    res.status(500).send({ error: "Failed to fetch books by review count", details: error });
  }
});

  

// GET /books/star - Get books with more than five 5-star reviews
router.get("/star", async (req, res) => {
  try {
    const books = await db.collection("users")
      .aggregate([
        // Unwind the reviews array to process each review
        { $unwind: "$reviews" },
        // Filter for reviews with a score of 5
        { $match: { "reviews.score": 5 } },
        // Group by book_id to count the number of 5-star reviews
        {
          $group: {
            _id: "$reviews.book_id", // Group by book_id
            fiveStarReviews: { $sum: 1 }, // Count 5-star reviews
          },
        },
        // Filter for books with more than 5 five-star reviews
        { $match: { fiveStarReviews: { $gt: 5 } } },
        // Join with the books collection to fetch full book details
        {
          $lookup: {
            from: "books",
            localField: "_id", // book_id from the reviews
            foreignField: "_id", // _id in the books collection
            as: "bookDetails",
          },
        },
        // Flatten the bookDetails array
        { $unwind: "$bookDetails" },
        // Optionally project fields for a cleaner output
        {
          $project: {
            _id: 0, // Exclude MongoDB's default _id field
            bookId: "$_id",
            fiveStarReviews: 1,
            bookDetails: 1,
          },
        },
        // Sort by the number of five-star reviews in descending order
        { $sort: { fiveStarReviews: -1 } },
      ])
      .toArray();

    res.status(200).send(books);
  } catch (error) {
    console.error("Error fetching books with 5-star reviews:", error);
    res.status(500).send({
      error: "Failed to fetch books with more than five 5-star reviews",
      details: error,
    });
  }
});


// GET /books/year/:year - Get books by a specific year
router.get("/:year", async (req, res) => {
  const year = parseInt(req.params.year);

  try {
    // Create a date range for the start and end of the year
    const startOfYear = new Date(year, 0, 1); // January 1st of the given year
    const endOfYear = new Date(year + 1, 0, 1); // January 1st of the next year (exclusive)

    // Find books published within the given year
    const books = await db.collection("books").find({
      publishedDate: { $gte: startOfYear, $lt: endOfYear }
    }).toArray();

    // Return the books found
    res.status(200).send(books);
  } catch (error) {
    res.status(500).send({ error: "Erro ao buscar livros do ano", details: error });
  }
});


export default router;
