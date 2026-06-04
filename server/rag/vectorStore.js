import { products } from "../data/catalog.js";
import { cosineSimilarity, embedText, initEmbeddingVocabulary } from "./embeddings.js";

/** 内存向量索引：每个商品及其 embedding 向量 @type {{ product: typeof products[0], vector: number[] }[]} */
let index = [];

// 服务启动时构建向量索引（RAG 检索的第一步：离线向量化）
export async function initVectorStore() {
  // 把商品名、描述、类别拼成一段文本，作为 embedding 输入
  const texts = products.map(
    (p) => `${p.name}. ${p.description}. Category: ${p.category}.`,
  );
  // 为本地 fallback embedding 构建词表
  initEmbeddingVocabulary(texts);

  // 为每个商品生成向量并存入内存索引
  index = await Promise.all(
    products.map(async (product, i) => ({
      product,
      vector: await embedText(texts[i]),
    })),
  );
}

// 语义搜索：将用户 query 向量化，与索引中所有商品比相似度，返回 Top-K
export async function searchProducts(query, topK = 3) {
  // 1. 将搜索词转为向量
  const queryVector = await embedText(query);
  return index
    .map(({ product, vector }) => ({
      product,
      score: cosineSimilarity(queryVector, vector),
    }))
    // 2. 按相似度降序排序
    .sort((a, b) => b.score - a.score)
    // 3. 取前 topK 个
    .slice(0, topK)
    // 4. 格式化为 API 响应字段
    .map(({ product, score }) => ({
      productId: product.productId,
      name: product.name,
      category: product.category,
      price: product.price,
      description: product.description,
      score: Number(score.toFixed(4)),
    }));
}
