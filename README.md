# WalmartOANodeAI
june 3
Your team wants to upgrade the product search used internally by a recommendation assistant. Here is the current implementation:
js
// Current product lookup used in our knowledge assistant
function findRelevantProducts(query, catalog) {
  const queryWords = query.toLowerCase().split(" ");
  return catalog.filter((product) =>
    queryWords.some((word) => product.description.toLowerCase().includes(word)),
  );
}
Explain how you would redesign this retrieval step as part of a RAG pipeline. What components would you introduce, and why is this approach better suited for a product Q&A assistant than keyword matching? **Answer:** _Write your answer here._ First, take every product description and run it through an AI model that turns text into numbers. Convert product descriptions into vectors. These numbers represent the meaning of the text. Do the same for the search query, then find the products whose numbers are closest. Pass those to an LLM to generate the answer. --- ## Question 2 (LLM) Your team is adding an LLM call to the recommendations endpoint to generate a short personalized summary for the top result (e.g., "Based on your interest in electronics, you might love this…"). Describe two production concerns you would address when calling an LLM API from this Node.js backend, and how you would handle each.