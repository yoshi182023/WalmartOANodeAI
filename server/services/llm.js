import {
  LLM_TIMEOUT_MS,
  OPENAI_MODEL,
  openaiClient,
} from "../config.js";

// 有 API Key 时使用共享客户端
const client = openaiClient;

// 统一封装 LLM 调用：带超时控制，失败时返回 null（触发 fallback）
async function callLLM(systemPrompt, userPrompt) {
  if (!client) return null;

  // 用 AbortController 实现超时，避免 LLM 拖慢整个接口
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  try {
    const response = await client.chat.completions.create(
      {
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 200,
        temperature: 0.4,
      },
      { signal: controller.signal },
    );
    return response.choices[0]?.message?.content?.trim() || null;
  } catch {
    // 超时或 API 错误时静默失败，由调用方使用模板 fallback
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// Question 1：RAG 生成阶段 —— 根据检索到的商品 context，让 LLM 生成自然语言回答
export async function generateSearchAnswer(query, retrievedProducts) {
  // 把检索到的商品格式化为 LLM 可读的 context
  const context = retrievedProducts
    .map(
      (p) =>
        `- ${p.name} (${p.category}, $${p.price}): ${p.description}`,
    )
    .join("\n");

  const llmAnswer = await callLLM(
    "You are a helpful product assistant. Answer briefly using only the provided product context.",
    `User question: ${query}\n\nRelevant products:\n${context}\n\nWrite a concise helpful answer.`,
  );

  if (llmAnswer) return llmAnswer;

  // fallback：无 API Key 或 LLM 失败时，返回模板拼接回答
  if (retrievedProducts.length === 0) {
    return `No relevant products found for "${query}".`;
  }

  const names = retrievedProducts.map((p) => p.name).join(", ");
  return `Based on your query "${query}", you may be interested in: ${names}.`;
}

// Question 2：为 Top 1 推荐商品生成一句个性化摘要
export async function generateRecommendationSummary(recentItems, topProduct) {
  // 统计用户最近浏览的各类别出现次数
  const categoryCounts = recentItems.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  // 找出出现最多的类别，用于 fallback 模板
  const topCategory = Object.entries(categoryCounts).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0];

  const recentSummary = recentItems
    .map((item) => `${item.productId} (${item.category})`)
    .join(", ");

  const llmSummary = await callLLM(
    "You write one short personalized product recommendation sentence.",
    `User recently viewed: ${recentSummary}. Top recommendation: ${topProduct.name} (${topProduct.category}, $${topProduct.price}) — ${topProduct.description}. Write one sentence like "Based on your interest in electronics, you might love this…"`,
  );

  if (llmSummary) return llmSummary;

  // fallback 模板摘要
  return `Based on your interest in ${topCategory}, you might love ${topProduct.name} — a ${topProduct.category} item at $${topProduct.price.toFixed(2)}.`;
}

/** 摘要缓存：避免同一用户重复请求 LLM，降低成本 @type {Map<string, { summary: string, expiresAt: number }>} */
const summaryCache = new Map();
// 缓存有效期 10 分钟
const CACHE_TTL_MS = 10 * 60 * 1000;

// 带缓存的摘要获取：命中缓存直接返回，否则调 LLM 并写入缓存
export async function getCachedRecommendationSummary(userId, recentItems, topProduct) {
  const cacheKey = `${userId}:${topProduct.productId}:${recentItems.map((i) => i.productId).join(",")}`;
  const cached = summaryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.summary;
  }

  const summary = await generateRecommendationSummary(recentItems, topProduct);
  summaryCache.set(cacheKey, { summary, expiresAt: Date.now() + CACHE_TTL_MS });
  return summary;
}
