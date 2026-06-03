import express from "express";
import recommendationsRouter from "./recommendations.js";
import { products } from "./data/catalog.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get("/products", (_req, res) => {
  res.json(products);
});

app.use("/recommendations", recommendationsRouter);

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the other process or set PORT=3002`);
    process.exit(1);
  }
  throw err;
});
