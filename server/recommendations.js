import express from "express";
import { products } from "./data/catalog.js";

const router = express.Router();

router.post("/", (req, res) => {
  const { userId, recentItems, topN } = req.body;

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "userId is required and must be a string" });
  }

  if (!Array.isArray(recentItems) || recentItems.length === 0) {
    return res.status(400).json({ error: "recentItems must be a non-empty array." });
  }

  if (recentItems.some((item) => !item.productId || !item.category)) {
    return res.status(400).json({ error: "Each recentItem must have a productId and category" });
  }

  if (!Number.isInteger(topN) || topN <= 0) {
    return res.status(400).json({ error: "topN must be a positive integer." });
  }

  const categoryFreq = recentItems.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  const existingIds = new Set(recentItems.map((item) => item.productId));

  const ranked = products
    .filter((product) => !existingIds.has(product.productId))
    .map((item) => ({ ...item, freq: categoryFreq[item.category] || 0 }))
    .filter((item) => item.freq > 0)
    .sort((a, b) => b.freq - a.freq)
    .slice(0, topN)
    .map(({ productId, name, category, price }) => ({ productId, name, category, price }));

  return res.status(200).json(ranked);
});

export default router;
