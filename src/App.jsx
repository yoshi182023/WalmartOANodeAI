import { useState, useEffect } from "react";
import "./App.css";

function App() {
  // 商品列表状态，初始为空数组，页面加载后从后端 /products 获取
  const [products, setProducts] = useState([]);
  // 用户最近浏览的商品列表，每项包含 productId 和 category
  const [recentItems, setRecentItems] = useState([]);
  // 推荐结果列表，调用 /recommendations 接口后填充
  const [recommendations, setRecommendations] = useState([]);
  // 用户希望返回的推荐数量 topN，默认为 5
  const [topN, setTopN] = useState(5);
  // 页面初次加载商品时的 loading 状态
  const [loading, setLoading] = useState(true);
  // 正在请求推荐接口时的 loading 状态，用于禁用按钮
  const [fetching, setFetching] = useState(false);
  // 错误信息，用于在页面上展示给用户
  const [error, setError] = useState(null);

  // 组件挂载时执行一次，从后端拉取全部商品
  useEffect(() => {
    // 请求 /products 接口（Vite 会代理到后端 3001 端口）
    fetch("/products")
      .then((res) => {
        // 若 HTTP 状态码不是 2xx，抛出错误进入 catch
        if (!res.ok) throw new Error("Failed to load products");
        // 将响应体解析为 JSON
        return res.json();
      })
      // 解析成功后，把商品数组写入 products 状态
      .then(setProducts)
      // 请求失败时，把错误信息写入 error 状态
      .catch((err) => setError(err.message))
      // 无论成功或失败，结束初次加载的 loading 状态
      .finally(() => setLoading(false));
  }, []); // 空依赖数组表示只在组件首次渲染时运行

  // 把 recentItems 中的 productId 收集成 Set，便于 O(1) 判断某商品是否已选中
  const recentIds = new Set(recentItems.map((i) => i.productId));

  // 点击商品卡片时，切换该商品在「最近浏览」列表中的选中状态
  function toggleRecent(product) {
    // 基于上一次的状态更新 recentItems（函数式更新，避免闭包陈旧值）
    setRecentItems((prev) => {
      // 检查当前商品是否已在 recentItems 中
      const exists = prev.some((i) => i.productId === product.productId);
      if (exists) {
        // 已存在则取消选中，从列表中过滤掉该商品
        return prev.filter((i) => i.productId !== product.productId);
      }
      // 不存在则追加，只保存 productId 和 category 供推荐接口使用
      return [...prev, { productId: product.productId, category: product.category }];
    });
    // 最近浏览变化后，清空旧的推荐结果
    setRecommendations([]);
    // 同时清除之前的错误提示
    setError(null);
  }

  // 点击「Get Recommendations」按钮时，向后端请求推荐
  async function getRecommendations() {
    // 未选任何最近浏览商品时，提示用户并中止请求
    if (recentItems.length === 0) {
      setError("Please select at least one recent item");
      return;
    }

    // 将 topN 转为数字，便于校验
    const n = Number(topN);
    // topN 必须是正整数，否则提示错误并中止
    if (!Number.isInteger(n) || n <= 0) {
      setError("topN must be a positive integer");
      return;
    }

    // 开始请求，显示 loading 并禁用按钮
    setFetching(true);
    // 发起新请求前清除旧错误
    setError(null);

    try {
      // POST 请求 /recommendations 接口
      const res = await fetch("/recommendations", {
        method: "POST",
        // 声明请求体为 JSON 格式
        headers: { "Content-Type": "application/json" },
        // 序列化请求体：用户 ID、最近浏览列表、推荐数量
        body: JSON.stringify({
          userId: "demo-user",
          recentItems,
          topN: n,
        }),
      });

      // 解析响应 JSON（无论成功或失败，后端都可能返回 JSON）
      const data = await res.json();
      // HTTP 非 2xx 时，用后端 error 字段或默认文案抛出异常
      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }
      // 请求成功，把推荐列表写入 recommendations 状态
      setRecommendations(data);
    } catch (err) {
      // 网络错误或业务错误，展示错误信息
      setError(err.message);
    } finally {
      // 无论成功失败，结束 fetching 状态，恢复按钮可点击
      setFetching(false);
    }
  }

  // 商品列表还在加载中时，只显示 Loading 占位界面
  if (loading) {
    return (
      <div className="app">
        <div className="status">Loading...</div>
      </div>
    );
  }

  // 主界面：商品选择、控制区、推荐结果
  return (
    <div className="app">
      {/* 页面顶部标题区 */}
      <header className="header">
        <h1>Product Recommendations</h1>
        <p className="subtitle">
          Select items you recently viewed, then get personalized suggestions
        </p>
      </header>

      {/* 有错误时在顶部显示红色错误条 */}
      {error && <div className="error">{error}</div>}

      {/* 最近浏览商品选择区 */}
      <section className="section">
        <div className="section-head">
          <h2>Recently Viewed</h2>
          {/* 显示当前已选中的商品数量 */}
          <span className="badge">{recentItems.length} selected</span>
        </div>
        <div className="grid">
          {/* 遍历全部商品，渲染可点击的选择卡片 */}
          {products.map((product) => (
            <button
              key={product.productId}
              type="button"
              // 已选中的卡片添加 card--selected 高亮样式
              className={`card card--clickable ${recentIds.has(product.productId) ? "card--selected" : ""}`}
              // 点击切换该商品的选中状态
              onClick={() => toggleRecent(product)}
            >
              <span className="card-category">{product.category}</span>
              <h3 className="card-title">{product.name}</h3>
              <p className="card-price">${product.price.toFixed(2)}</p>
              <span className="card-action">
                {/* 根据是否已选中显示不同文案 */}
                {recentIds.has(product.productId) ? "Selected" : "Add to recent"}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 控制区：设置 topN 并触发推荐请求 */}
      <section className="section controls">
        <label className="topn-label">
          Top N:
          <input
            type="number"
            min="1"
            max="12"
            step="1"
            value={topN}
            onChange={(e) => {
              // 读取输入框数值（十进制整数）
              const val = parseInt(e.target.value, 10);
              // 合法数字才更新 topN 状态
              if (!Number.isNaN(val)) setTopN(val);
            }}
          />
        </label>
        <button
          type="button"
          className="btn-primary"
          onClick={getRecommendations}
          // 请求进行中时禁用按钮，防止重复提交
          disabled={fetching}
        >
          {/* 请求中显示 Loading，否则显示按钮文案 */}
          {fetching ? "Loading..." : "Get Recommendations"}
        </button>
      </section>

      {/* 有推荐结果时才渲染推荐区域 */}
      {recommendations.length > 0 && (
        <section className="section">
          <h2>Recommended for You</h2>
          <div className="grid">
            {/* 遍历推荐列表，展示每个推荐商品 */}
            {recommendations.map((item) => (
              <article key={item.productId} className="card card--highlight">
                <span className="card-category">{item.category}</span>
                <h3 className="card-title">{item.name}</h3>
                <p className="card-price">${item.price.toFixed(2)}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}


export default App;
