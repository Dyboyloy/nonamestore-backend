import express, { type Express } from 'express';
import { register, login, logout } from '../Controller/AuthControl';

const AuthRoute = express.Router();

AuthRoute.post('/register', register);
AuthRoute.post('/login', login);
AuthRoute.post('/logout', logout);

export default AuthRoute;
