import express, { type Express } from 'express';
import { protect } from '../Middleware/protection';
import { getUserProfile, updateUserPassword, updateUserProfile, deleteUserAccount } from '../Controller/UserControl';

const UserRoute = express.Router();

// Protect all routes
UserRoute.use(protect);

// Get user profile
UserRoute.get('/profile', getUserProfile);

// Update user profile
UserRoute.patch('/profile', updateUserProfile);

// Update user password
UserRoute.patch('/password', updateUserPassword);

// Delete user account
UserRoute.delete('/delete', deleteUserAccount);

export default UserRoute;