import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [products, setProducts] = useState([]);
  const [recentItems, setRecentItems] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [topN, setTopN] = useState(5);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/products")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load products");
        return res.json();
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

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }
      setRecommendations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setFetching(false);
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

      {recommendations.length > 0 && (
        <section className="section">
          <h2>Recommended for You</h2>
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
