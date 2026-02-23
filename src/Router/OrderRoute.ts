import express, { type Express } from 'express';
import { getSellerOrder, getOrderById, updateOrderStatus } from '../Controller/OrderController';
import { protect } from '../Middleware/protection';

const OrderRoute = express.Router();

OrderRoute.use(protect);

//Get Seller all order
OrderRoute.get('/seller', getSellerOrder);
// Get order by its id
OrderRoute.get('/:id', getOrderById);
// Update the order status
OrderRoute.patch('/update/staus/:id', updateOrderStatus)

export default OrderRoute;
