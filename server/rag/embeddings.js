import {
  EMBEDDING_MODEL,
  openaiClient,
} from "../config.js";

// 有 API Key 时使用共享客户端，否则为 null（走本地 embedding）
const client = openaiClient;

/** 本地 fallback 用的词表：单词 -> 向量维度索引 @type {Map<string, number>} */
let vocabulary = new Map();

// 将文本拆成小写单词数组，作为本地 embedding 的基础
function tokenize(text) {
  return (text.toLowerCase().match(/\w+/g) || []);
}

// 从所有商品描述中构建词表，每个唯一单词对应一个向量维度
function buildVocabulary(texts) {
  const vocab = new Map();
  let index = 0;
  for (const text of texts) {
    for (const word of tokenize(text)) {
      if (!vocab.has(word)) {
        vocab.set(word, index++);
      }
    }
  }
  return vocab;
}

// 将向量归一化为单位向量，便于计算余弦相似度
function normalize(vector) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) return vector;
  return vector.map((value) => value / magnitude);
}

// 本地 fallback：词袋模型，统计词频后归一化（无 API Key 时使用）
function localEmbed(text, vocab) {
  const vector = Array(vocab.size).fill(0);
  for (const word of tokenize(text)) {
    const index = vocab.get(word);
    if (index !== undefined) vector[index] += 1;
  }
  return normalize(vector);
}

// 初始化词表，在服务启动时对全部商品描述调用一次
export function initEmbeddingVocabulary(texts) {
  vocabulary = buildVocabulary(texts);
}

// 将任意文本转为向量：有 OpenAI 则调 Embedding API，失败或无 Key 时用本地词袋
export async function embedText(text) {
  if (client) {
    try {
      const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
      });
      return response.data[0].embedding;
    } catch {
      // API 配额不足或网络错误时降级为本地 embedding
      if (vocabulary.size === 0) initEmbeddingVocabulary([text]);
      return localEmbed(text, vocabulary);
    }
  }
  return localEmbed(text, vocabulary);
}

// 计算两个向量的余弦相似度，值越接近 1 表示语义越相近
export function cosineSimilarity(a, b) {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
