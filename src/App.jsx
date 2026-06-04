import { useState, useEffect } from "react";
import "./App.css";

async function parseJsonResponse(res) {
  const text = await res.text();
  if (!text) {
    throw new Error("Backend returned empty response — is the server running on port 3001?");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON from server — check that backend is running (npm run dev)");
  }
}

// 兼容新旧两种响应格式：数组 或 { recommendations, summary }
function parseRecommendationsPayload(data) {
  if (Array.isArray(data)) {
    return { recommendations: data, summary: null };
  }
  return {
    recommendations: data.recommendations || [],
    summary: data.summary || null,
  };
}

function App() {
  const [products, setProducts] = useState([]);
  const [recentItems, setRecentItems] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [topN, setTopN] = useState(5);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [recommendationsFetched, setRecommendationsFetched] = useState(false);
  const [error, setError] = useState(null);

  // RAG 商品搜索（Question 1）
  const [searchQuery, setSearchQuery] = useState("");
  const [searchAnswer, setSearchAnswer] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetch("/products")
      .then(async (res) => {
        const data = await parseJsonResponse(res);
        if (!res.ok) throw new Error(data.error || "Failed to load products");
        return data;
      })
      .then(setProducts)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const recentIds = new Set(recentItems.map((i) => i.productId));

  function toggleRecent(product) {
    setRecentItems((prev) => {
      const exists = prev.some((i) => i.productId === product.productId);
      if (exists) {
        return prev.filter((i) => i.productId !== product.productId);
      }
      return [...prev, { productId: product.productId, category: product.category }];
    });
    setRecommendations([]);
    setSummary(null);
    setRecommendationsFetched(false);
    setError(null);
  }

  async function getRecommendations() {
    if (recentItems.length === 0) {
      setError("Please select at least one recent item");
      return;
    }

    const n = Number(topN);
    if (!Number.isInteger(n) || n <= 0) {
      setError("topN must be a positive integer");
      return;
    }

    setFetching(true);
    setError(null);
    setSummary(null);

    try {
      const res = await fetch("/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "demo-user",
          recentItems,
          topN: n,
        }),
      });

      const data = await parseJsonResponse(res);
      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

      const { recommendations: recs, summary: sum } = parseRecommendationsPayload(data);
      setRecommendations(recs);
      setSummary(sum);
      setRecommendationsFetched(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setFetching(false);
    }
  }

  async function searchProducts() {
    const query = searchQuery.trim();
    if (!query) {
      setError("Please enter a search query");
      return;
    }

    setSearching(true);
    setError(null);
    setSearchAnswer(null);
    setSearchResults([]);

    try {
      const res = await fetch("/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, topK: 3 }),
      });

      const data = await parseJsonResponse(res);
      if (!res.ok) {
        throw new Error(data.error || "Search failed");
      }

      setSearchAnswer(data.answer);
      setSearchResults(data.products || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }

  if (loading) {
    return (
      <div className="app">
        <div className="status">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Product Recommendations</h1>
        <p className="subtitle">
          Select items you recently viewed, then get personalized suggestions
        </p>
      </header>

      {error && <div className="error">{error}</div>}

      {/* Question 1: RAG 语义搜索 */}
      <section className="section">
        <h2>Product Q&amp;A Search (RAG)</h2>
        <p className="hint">Ask in natural language — e.g. &quot;wireless audio devices&quot;</p>
        <div className="controls">
          <input
            type="text"
            className="search-input"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchProducts()}
          />
          <button
            type="button"
            className="btn-primary"
            onClick={searchProducts}
            disabled={searching}
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </div>

        {searchAnswer && (
          <div className="summary-box">
            <strong>Answer:</strong> {searchAnswer}
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="grid">
            {searchResults.map((item) => (
              <article key={item.productId} className="card">
                <span className="card-category">{item.category}</span>
                <h3 className="card-title">{item.name}</h3>
                <p className="card-price">${item.price.toFixed(2)}</p>
                <p className="card-desc">{item.description}</p>
                <p className="card-score">Relevance: {item.score}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Recently Viewed</h2>
          <span className="badge">{recentItems.length} selected</span>
        </div>
        <div className="grid">
          {products.map((product) => (
            <button
              key={product.productId}
              type="button"
              className={`card card--clickable ${recentIds.has(product.productId) ? "card--selected" : ""}`}
              onClick={() => toggleRecent(product)}
            >
              <span className="card-category">{product.category}</span>
              <h3 className="card-title">{product.name}</h3>
              <p className="card-price">${product.price.toFixed(2)}</p>
              <span className="card-action">
                {recentIds.has(product.productId) ? "Selected" : "Add to recent"}
              </span>
            </button>
          ))}
        </div>
      </section>

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
              const val = parseInt(e.target.value, 10);
              if (!Number.isNaN(val)) setTopN(val);
            }}
          />
        </label>
        <button
          type="button"
          className="btn-primary"
          onClick={getRecommendations}
          disabled={fetching}
        >
          {fetching ? "Loading..." : "Get Recommendations"}
        </button>
      </section>

      {(recommendationsFetched || fetching) && (
        <section className="section">
          <h2>Recommended for You</h2>

          {fetching && <p className="hint">Loading recommendations...</p>}

          {summary && (
            <div className="summary-box summary-box--highlight">
              {summary}
            </div>
          )}

          {!fetching && recommendations.length === 0 && (
            <p className="hint">No recommendations found. Try selecting different items.</p>
          )}

          <div className="grid">
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
