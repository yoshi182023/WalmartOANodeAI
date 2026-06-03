const products = [
    { productId: "p1", name: "Wireless Mouse", category: "电子", price: 29.99 },
    { productId: "p2", name: "Running Shoes", category: "sports", price: 79.99 },
    { productId: "p3", name: "USB-C Hub", category: "电子", price: 39.99 },
    { productId: "p4", name: "Yoga Mat", category: "sports", price: 24.99 },
    { productId: "p5", name: "Water Bottle", category: "sports", price: 14.99 },
    { productId: "p6", name: "Resistance Bands", category: "sports", price: 19.99 },
    { productId: "p7", name: "Classic T-Shirt", category: "apparel", price: 24.99 },
    { productId: "p8", name: "Desk Lamp", category: "home", price: 34.99 },
    { productId: "p9", name: "Wireless Headphones", category: "电子", price: 79.99 },
    { productId: "p10", name: "Novel Collection", category: "books", price: 49.99 },
    { productId: "p11", name: "Cookbook", category: "books", price: 29.99 },
    { productId: "p12", name: "Smart Watch", category: "电子", price: 149.0 },
];


let recentItems = [
    { "productId": "p1", "category": "电子" },
    { "productId": "p3", "category": "电子" },
    { "productId": "p7", "category": "apparel" }
]
const categoryFreq = recentItems.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
}, {});
console.log("categoryFreq", categoryFreq)
const existingIds = new Set(recentItems.map((item) => item.productId));
console.log("existingIds", existingIds)
const rankedFilter = products.filter((product) => !existingIds.has(product.productId))
//如果该 ID 不存在于 Set 中，则为 true
let rankedMap = rankedFilter.map((item) => ({ ...item, freq: categoryFreq[item.category] || 0 }))
// console.log("rankedFilter",rankedFilter)
console.log("rankedMap", rankedMap)
const rankedSort = products
    .filter((product) => !existingIds.has(product.productId))
    .map((item) => ({ ...item, freq: categoryFreq[item.category] || 0 }))
    .filter((item) => item.freq > 0)
    .sort((a, b) => b.freq - a.freq)


console.log("rankedSort : ", rankedSort)
console.log(rankedSort.map(({ productId, name, category, price }) => ({ productId, name, category, price })))
//.map 函数遍历每个元素，对每个元素使用解构 { productId, name, category, price } 提取这四个属性，然后返回一个新对象 { productId, name, category, price }，也就是只保留这四个属性（可能原对象还有其他属性被丢弃）
const ranked = products
    .filter((product) => !existingIds.has(product.productId))
    .map((item) => ({ ...item, freq: categoryFreq[item.category] || 0 }))
    .filter((item) => item.freq > 0)
    .sort((a, b) => b.freq - a.freq)
    .slice(0, 2)
    .map(({ productId, name, category, price }) => ({ productId, name, category, price }));


