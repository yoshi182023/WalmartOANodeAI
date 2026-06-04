import express from "express";
import { searchProducts } from "./rag/vectorStore.js";
import { generateSearchAnswer } from "./services/llm.js";

const router = express.Router();

// POST /search —— RAG 商品问答搜索接口（Question 1）
router.post("/", async (req, res) => {
  const { query, topK = 3 } = req.body;

  // 校验 query：必须是非空字符串
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return res.status(400).json({ error: "query is required and must be a non-empty string" });
  }

  const k = Number(topK);
  // 校验 topK：必须是正整数
  if (!Number.isInteger(k) || k <= 0) {
    return res.status(400).json({ error: "topK must be a positive integer" });
  }

  try {
    // 1. 检索阶段：向量相似度搜索，取出最相关的 topK 商品
    const products = await searchProducts(query.trim(), k);
    // 2. 生成阶段：把检索结果作为 context，让 LLM 生成自然语言回答
    const answer = await generateSearchAnswer(query.trim(), products);

    return res.status(200).json({ query: query.trim(), answer, products });
  } catch {
    return res.status(500).json({ error: "Failed to process search request" });
  }
});

export default router;
