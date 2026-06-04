# WalmartOANodeAI

> 商品推荐系统（Node.js + Express + React）  
> 提交日期：June 3

---

## 项目简介

这是一个前后端分离的商品推荐应用：

| 部分 | 说明 |
|------|------|
| **前端** | React + Vite，用户选择「最近浏览」商品，请求推荐结果 |
| **后端** | Express，提供 `GET /products` 和 `POST /recommendations` |
| **推荐逻辑** | 统计 `recentItems` 中各类别出现频率，按频率排序返回未浏览过的同类商品 |

### 快速启动

```bash
npm install
npm run dev
```

- 前端：http://localhost:5173
- 后端：http://localhost:3001

### 推荐接口示例

**请求** `POST /recommendations`

```json
{
  "userId": "u42",
  "recentItems": [
    { "productId": "p1", "category": "electronics" },
    { "productId": "p3", "category": "electronics" },
    { "productId": "p7", "category": "apparel" }
  ],
  "topN": 2
}
```

**响应**

```json
[
  { "productId": "p9", "name": "Wireless Headphones", "category": "electronics", "price": 79.99 },
  { "productId": "p12", "name": "Smart Watch", "category": "electronics", "price": 149.00 }
]
```

**中文解释：**  
用户最近看了 2 个 electronics 和 1 个 apparel。系统排除已看过的 p1、p3、p7，在剩余商品中优先推荐 electronics 类别（出现频率最高），返回 top 2。

---

## Question 1（RAG 检索改造）

**英文题目：**  
Your team wants to upgrade the product search used internally by a recommendation assistant. Here is the current implementation:

```js
// Current product lookup used in our knowledge assistant
function findRelevantProducts(query, catalog) {
  const queryWords = query.toLowerCase().split(" ");
  return catalog.filter((product) =>
    queryWords.some((word) => product.description.toLowerCase().includes(word)),
  );
}
```

Explain how you would redesign this retrieval step as part of a RAG pipeline. What components would you introduce, and why is this approach better suited for a product Q&A assistant than keyword matching?

**中文题目解释：**  
团队想升级内部推荐助手用的商品搜索。上面是当前的**关键词匹配**实现——把用户 query 拆成单词，只要商品描述里包含任意一个词就算匹配。  
请说明如何把它改造成 **RAG（Retrieval-Augmented Generation，检索增强生成）** 流水线，需要引入哪些组件，以及为什么比关键词匹配更适合商品问答场景。

---

**Answer（英文答案）：**

First, take every product description and run it through an AI model that turns text into numbers. Convert product descriptions into vectors. These numbers represent the meaning of the text. Do the same for the search query, then find the products whose numbers are closest. Pass those to an LLM to generate the answer.

**中文答案解释：**

1. **Embedding（向量化）**  
   把每条商品描述通过 Embedding 模型转成向量（一串数字），语义相近的文本在向量空间里距离更近。

2. **向量数据库（如 Pinecone、FAISS、pgvector）**  
   离线把所有商品向量存入索引；用户提问时，把 query 也转成向量，做**相似度检索**（如 cosine similarity），取出 Top-K 最相关商品。

3. **LLM 生成**  
   把检索到的商品信息作为 context 传给大模型，由 LLM 组织自然语言回答，而不是直接返回原始描述片段。

4. **为什么比关键词匹配更好（中文总结）：**

   | 关键词匹配 | RAG 语义检索 |
   |-----------|-------------|
   | 「耳机」搜不到「Wireless Headphones」 | 语义相近即可匹配 |
   | 同义词、拼写变体容易漏检 | 向量表示语义，容错更强 |
   | 无法理解用户真实意图 | 适合自然语言问答 |
   | 返回原始片段，体验差 | LLM 可生成连贯、个性化的回答 |

---

## Question 2（LLM 生产环境考量）

**英文题目：**  
Your team is adding an LLM call to the recommendations endpoint to generate a short personalized summary for the top result (e.g., "Based on your interest in electronics, you might love this…"). Describe two production concerns you would address when calling an LLM API from this Node.js backend, and how you would handle each.

**中文题目解释：**  
团队计划在推荐接口里调用 LLM，为 Top 1 商品生成一句个性化摘要（例如："Based on your interest in electronics, you might love this…"）。  
请描述在 Node.js 后端调用 LLM API 时需要关注的 **2 个生产环境问题**，以及各自的应对方案。

---

**Answer（英文答案）：**

**1. Latency & timeouts（延迟与超时）**  
LLM API calls can take several seconds. I would set a strict timeout (e.g., 5s), use async/await with `AbortController`, and return the recommendation without the summary if the LLM call fails or times out — so the core API stays fast and reliable.

**2. Cost & rate limiting（成本与限流）**  
Each LLM call costs money. I would cache summaries by `(userId, productId)` in Redis, add rate limiting per user, and only call the LLM for the top result rather than every item in the response.

**中文答案解释：**

| 生产问题 | 为什么重要 | 如何处理 |
|---------|-----------|---------|
| **延迟 / 超时** | LLM 响应慢，会拖垮整个推荐接口 | 设超时（如 5s）；超时或失败时**降级**——仍返回推荐列表，只是没有 LLM 摘要 |
| **成本 / 限流** | 每次调用都计费，高并发下费用暴涨 | 用 Redis 缓存已生成的摘要；按 userId 限流；只对 Top 1 调 LLM，不对每条结果都调 |

其他常见考量（补充说明）：
- **错误重试**：对 429/5xx 做指数退避重试，避免雪崩
- **Prompt 注入**：对用户输入做 sanitize，避免恶意 prompt
- **可观测性**：记录 latency、token 用量、失败率，便于监控和告警
