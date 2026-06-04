import express from "express";
import { products } from "./data/catalog.js";
import { getCachedRecommendationSummary } from "./services/llm.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { userId, recentItems, topN } = req.body;

  // 校验 userId
  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "userId is required and must be a string" });
  }

  // 校验 recentItems 必须是非空数组
  if (!Array.isArray(recentItems) || recentItems.length === 0) {
    return res.status(400).json({ error: "recentItems must be a non-empty array." });
  }

  // 校验每个 recentItem 必须有 productId 和 category
  if (recentItems.some((item) => !item.productId || !item.category)) {
    return res.status(400).json({ error: "Each recentItem must have a productId and category" });
  }

  // 校验 topN 必须是正整数
  if (!Number.isInteger(topN) || topN <= 0) {
    return res.status(400).json({ error: "topN must be a positive integer." });
  }

  // 统计各类别在 recentItems 中的出现频率
  const categoryFreq = recentItems.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  // 收集已浏览商品 ID，推荐时排除这些
  const existingIds = new Set(recentItems.map((item) => item.productId));

  const recommendations = products
    .filter((product) => !existingIds.has(product.productId))
    .map((item) => ({ ...item, freq: categoryFreq[item.category] || 0 }))
    .filter((item) => item.freq > 0)
    .sort((a, b) => b.freq - a.freq)
    .slice(0, topN)
    .map(({ productId, name, category, price, description }) => ({
      productId,
      name,
      category,
      price,
      description,
    }));

  // Question 2：为 Top 1 推荐商品生成 LLM 个性化摘要（带缓存和 fallback）
  let summary = null;
  if (recommendations.length > 0) {
    try {
      summary = await getCachedRecommendationSummary(
        userId,
        recentItems,
        recommendations[0],
      );
    } catch {
      summary = null;
    }
  }

  return res.status(200).json({ recommendations, summary });
});

export default router;
