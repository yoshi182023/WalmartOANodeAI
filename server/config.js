// 加载 .env 环境变量（OPENAI_API_KEY 等）
import "dotenv/config";
import OpenAI from "openai";

// LLM 调用超时时间（毫秒），默认 5 秒，超时后降级返回模板文案
export const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 5000;
// OpenAI API 密钥，未配置时使用本地 fallback
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
// 对话模型名称，用于生成搜索回答和推荐摘要
export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
// Embedding 模型名称，用于将文本转为向量
export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";

// 判断是否已配置 OpenAI，决定走真实 API 还是本地 fallback
export function hasOpenAI() {
  return Boolean(OPENAI_API_KEY);
}

// 共享 OpenAI 客户端：禁用自动重试，避免 429 配额错误时长时间阻塞接口
export const openaiClient = hasOpenAI()
  ? new OpenAI({ apiKey: OPENAI_API_KEY, maxRetries: 0, timeout: LLM_TIMEOUT_MS })
  : null;
