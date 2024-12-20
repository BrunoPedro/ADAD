import express from "express";
import db from "../db/config.js";
import { ObjectId } from "mongodb";

const router = express.Router();

//Adicionar 1 ou vários livros. Post localhost:3000/api/books/createbooks

router.post('/createbooks', async (req, res) => {
  try {
      const booksCollection = db.collection('books');
      const lastBooks = await booksCollection.find().sort({ _id: -1 }).limit(1).toArray();

      const newBookId = lastBooks.length > 0 ? lastBooks[0]._id + 1 : 1;

      const newBook = {
          _id: newBookId,
          title: "Unlocking Android",
          isbn: "1933988673",
          pageCount: 416,
          publishedDate: new Date("2009-04-01T07:00:00.000+00:00"),
          thumbnailUrl: "https://s3.amazonaws.com/AKIAJC5RLADLUMVRPFDQ.book-thumb-images/ableso…",
          shortDescription: "Unlocking Android: A Developer's Guide provides concise, hands-on instructions for building apps...",
          longDescription: "Android is an open source mobile phone platform based on the Linux operating system...",
          status: "PUBLISH",
          authors: ["John Doe", "Jane Smith", "Alex Johnson"],
          categories: ["Android", "Mobile Development"]
      };

      const createBookResult = await booksCollection.insertOne(newBook);

      if (createBookResult.insertedId) {
          res.status(201).json({
              message: "Book created successfully",
              book: { _id: createBookResult.insertedId, ...newBook }
          });
      } else {
          res.status(500).json({ message: "Error inserting book", result: createBookResult });
      }

  } catch (error) {
      console.error("Error creating book:", error);  
      res.status(500).json({ message: "Error creating book", error: error.message });
  }
});

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
    return res.status(400).send({ message: "No data to update" });
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
    console.error("Error updating book:", error);
    res.status(500).send({ error: "Erro ao atualizar o livro", details: error });
  }
});

//Remover livro pelo _id  Delete localhost:3000/api/books/deletebook/:id


router.delete('/deletebook/:id', async (req, res) => {
  try {
      const { id } = req.params; 
      const book_id = parseInt(id.replace(':', ''), 10); 
      const booksCollection = db.collection('books');

      // Perform the deletion operation
      const deleteBookResult = await booksCollection.deleteOne({ _id: book_id });

      if (deleteBookResult.deletedCount === 0) {
          return res.status(404).json({ message: "Livro não encontrado." });
      }

      return res.status(200).json({ message: "Livro excluído com sucesso." }); 

  } catch (error) {
      res.status(500).json({ message: "Error deleting book", error: error.message });
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
    console.error("Error fetching top books:", error);
    res.status(500).send({ error: "Erro ao buscar os melhores livros", details: error });
  }
});

//Lista de livros que têm comentários. Ordenado pelo número total de comentários.
//GET localhost:3000/api/books/comments

router.get('/comments', async (req, res) => {
  try {
      const booksCollection = db.collection('books');
      const commentsCollection = db.collection('comments');

      
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20; 
      const skip = (page - 1) * limit;

 
      const booksWithComments = await booksCollection.aggregate([
          {
              $lookup: {
                  from: "comments",  
                  localField: "_id",  
                  foreignField: "book_id",  
                  as: "comments"  
              }
          },
          {
              $addFields: {
                  commentCount: { $size: "$comments" }  
              }
          },
          {
              $match: {
                  commentCount: { $gt: 0 }  
              }
          },
          {
              $sort: { commentCount: -1 } 
          },
          {
              $skip: skip,  
          },
          {
              $limit: limit,  
          },
          {
              $project: {
                  title: 1,  
                  commentCount: 1  
              }
          }
      ]).toArray();

      const totalBooksWithComments = await booksCollection.aggregate([
          {
              $lookup: {
                  from: "comments",  
                  localField: "_id",  
                  foreignField: "book_id",  
                  as: "comments"  
              }
          },
          {
              $addFields: {
                  commentCount: { $size: "$comments" }  
              }
          },
          {
              $match: {
                  commentCount: { $gt: 0 } 
              }
          },
          {
              $count: "total"  
          }
      ]).toArray();

      const totalCount = totalBooksWithComments.length > 0 ? totalBooksWithComments[0].total : 0;


      const totalPages = Math.ceil(totalCount / limit);

   
      const response = { 
          pagination: {
              count: totalCount,
              pages: totalPages,
              currentPage: page,
              next: page < totalPages ? `/books/comments?page=${page + 1}&limit=${limit}` : null,
              prev: page > 1 ? `/books/comments?page=${page - 1}&limit=${limit}` : null
          },
          books: booksWithComments,
         
      };

    
      res.status(200).json(response);

  } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Erro ao recuperar livros com comentários", error: error.message });
  }
});

// GET /books/ratings/:order
router.get("/ratings/:order", async (req, res) => {
  const { order } = req.params;
  const order1= order.replace(':', '');

  if (order1 !== "asc" && order1 !== "desc") {
    return res.status(400).send({ message: "Parametros inválidos. Use 'asc' or 'desc'." });
  }

  const sortOrder = order1 === "asc" ? 1 : -1;

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

//Lista de livros filtrada por preço, categoria e/ou autor. 
//GET localhost:3000/api/books/search/categories/:category

router.get('/search/categories/:category', async (req, res) => {
  try {
      let { category } = req.params;  
      category = category.replace(":", "");
      const booksCollection = db.collection('books');

   
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10; 
      const skip = (page - 1) * limit;

  
      const aggregationPipeline = [
          { $unwind: "$categories" },  
          { $match: { "categories": category } },  
          { $skip: skip },  
          { $limit: limit },  
          { $sort: { title: 1 } } 
      ];

   
      const books = await booksCollection.aggregate(aggregationPipeline).toArray();

      const totalBooks = await booksCollection.aggregate([
          { $unwind: "$categories" },
          { $match: { "categories": category } },
          { $count: "count" }
      ]).toArray();

      const totalCount = totalBooks.length > 0 ? totalBooks[0].count : 0;
      const totalPages = Math.ceil(totalCount / limit);

      const response = {
          pagination: {
              count: totalCount,
              pages: totalPages,
              currentPage: page,
              next: page < totalPages ? `/books/search/categories/${category}?page=${page + 1}&limit=${limit}` : null,
              prev: page > 1 ? `/books/search/categories/${category}?page=${page - 1}&limit=${limit}` : null,
          },
          books: books,
      };

      res.status(200).json(response);
  } catch (error) {
      res.status(500).json({ message: "Erro ao pesquisar livros na categoria", error: error.message });
  }
});

router.get('/searchbook/:id', async (req, res) => {
  try {
      const { id } = req.params; 
      const book_id = parseInt(id.replace(':', ''), 10); 
      const booksCollection = db.collection('books');
      const commentsCollection = db.collection('comments');
      const usersCollection = db.collection('users');

 
      const book = await booksCollection.findOne({ _id: book_id });
      if (!book) {
          return res.status(404).json({ message: "Livro não encontrado." });
      }


      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20; 
      const skip = (page - 1) * limit;


      const userReviews = await usersCollection.aggregate([
          { $unwind: "$reviews" },
          { $match: { "reviews.book_id": book_id } },
          { $skip: skip },
          { $limit: limit }, 
          {
              $group: {
                  _id: null,
                  reviews: { $push: "$reviews" },
                  averageScore: { $avg: "$reviews.score" }
              }
          }
      ]).toArray();

  
      const averageScore = userReviews.length > 0 ? userReviews[0].averageScore : null;
      const reviews = userReviews.length > 0 ? userReviews[0].reviews : [];

      const commentPage = parseInt(req.query.commentPage) || 1;
      const commentLimit = parseInt(req.query.commentLimit) || 20;
      const commentSkip = (commentPage - 1) * commentLimit;


      const comments = await commentsCollection.aggregate([
          { $match: { book_id: book_id } },
          { $skip: commentSkip },
          { $limit: commentLimit },
          { $project: { comment: 1, _id: 0 } }
      ]).toArray();

  
      const totalComments = await commentsCollection.countDocuments({ book_id: book_id });
      const totalReviews = userReviews.length > 0 ? userReviews[0].reviews.length : 0;

      const response = {
          pagination: {
              reviews: {
                  count: totalReviews,
                  pages: Math.ceil(totalReviews / limit),
                  currentPage: page,
                  next: page < Math.ceil(totalReviews / limit) ? `/api/books/searchbook/${id}?page=${page + 1}&limit=${limit}` : null,
                  prev: page > 1 ? `/api/books/searchbook/${id}?page=${page - 1}&limit=${limit}` : null,
              },
              comments: {
                  count: totalComments,
                  pages: Math.ceil(totalComments / commentLimit),
                  currentPage: commentPage,
                  next: commentPage < Math.ceil(totalComments / commentLimit) ? `/api/books/searchbook/${id}?commentPage=${commentPage + 1}&commentLimit=${commentLimit}` : null,
                  prev: commentPage > 1 ? `/api/books/searchbook/${id}?commentPage=${commentPage - 1}&commentLimit=${commentLimit}` : null,
              }
          },
          book: book,
          averageScore: averageScore,
          reviews: reviews,
          comments: comments,
          
      };

      res.status(200).json(response);
  } catch (error) {
      res.status(500).json({ message: "Error retrieving book", error: error.message });
  }
});


// GET /books/ratings/:order
router.get("/ratings/:order", async (req, res) => {
  const { order } = req.params;

  if (order !== "asc" && order !== "desc") {
    return res.status(400).send({ message: "Invalid order parameter. Use 'asc' or 'desc'." });
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
    console.error("Error fetching books by review count:", error);
    res.status(500).send({ error: "Failed to fetch books by review count", details: error });
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
    console.error("Error fetching books with 5-star reviews:", error);
    res.status(500).send({
      error: "Failed to fetch books with more than five 5-star reviews",
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
    res.status(500).send({ error: "Erro ao buscar livros do ano", details: error });
  }
});

export default router;
