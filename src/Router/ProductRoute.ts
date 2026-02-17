import express, { type Express } from 'express';
import { protect } from '../Middleware/protection';
import { addDiscount, createProduct, deleteProduct, getProductById, getProducts, getRecommendedProducts, getSellerProducts, getUserPurchaseHistory, removeDiscount, updateProduct } from '../Controller/ProductControl';

const ProductRoute: Express = express();

ProductRoute.use(protect);

// Get products with optional query parameters for filtering and pagination
ProductRoute.get("/", getProducts);
// Get products of the authenticated user
ProductRoute.get("/my-products", getSellerProducts);
// Get a specific product by ID
ProductRoute.get("/:id", getProductById);
// Get usr purchase products history
ProductRoute.get("/purchase", getUserPurchaseHistory);
// Get recommend products
ProductRoute.get("/recommend", getRecommendedProducts);
// Create a new product
ProductRoute.post("/add", createProduct);
// Update product by ID
ProductRoute.patch("/update/:id", updateProduct);
// Add discount percentage to a product
ProductRoute.patch("/discount/:id", addDiscount);
// Remove discount price
ProductRoute.patch("/delete/discount/:id", removeDiscount);
// Delete a product by ID
ProductRoute.delete("/delete/:id", deleteProduct);


export default ProductRoute;