import express from "express";
import recommendationsRouter from "./recommendations.js";
import searchRouter from "./search.js";
import { products } from "./data/catalog.js";
import { initVectorStore } from "./rag/vectorStore.js";
import { hasOpenAI } from "./config.js";

const app = express();
const PORT = process.env.PORT || 3001;

// 解析 JSON 请求体
app.use(express.json());

// 健康检查：返回服务状态和是否启用 OpenAI
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    openai: hasOpenAI(),
    features: ["recommendations", "rag-search"],
  });
});

// 返回全部商品目录
app.get("/products", (_req, res) => {
  res.json(products);
});

// 推荐接口（含 LLM 摘要）
app.use("/recommendations", recommendationsRouter);
// RAG 语义搜索接口
app.use("/search", searchRouter);

async function start() {
  // 先启动 HTTP 服务，保证 /products 等接口立即可用
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

  // 向量索引在后台构建，失败不影响商品列表和推荐接口
  try {
    await initVectorStore();
    console.log(`Vector store ready (${products.length} products indexed)`);
  } catch (err) {
    console.warn("Vector store init failed — RAG search may be unavailable:", err.message);
  }

  if (!hasOpenAI()) {
    console.log("OPENAI_API_KEY not set — using local embeddings and template LLM fallbacks");
  }
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
