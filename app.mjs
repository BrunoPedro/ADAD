import express from "express";
import movies from "./routes/movies.js";
import books from "./routes/books.js";
// Add a placeholder for users if needed
// import users from "./routes/users.js";

const app = express();
const port = 3000;

app.use(express.json());
// Load the /movies routes
app.use("/movies", movies);
app.use("/books", books);
// Uncomment this line if you have a `users.js` file:
// app.use("/users", users);

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
