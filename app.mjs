import express from "express";
import books from "./routes/books.js";
import comments from "./routes/comments.js";
import users from "./routes/users.js";
import livrarias from "./routes/livrarias.js";

const app = express();
const port = 3000;

app.use(express.json());
// Load the /movies routes
app.use("/books", books);
app.use("/comments", comments);
app.use("/users", users);
app.use("/livrarias", livrarias);

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});
