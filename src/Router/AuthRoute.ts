import express, { type Express } from 'express';
import { register, login } from '../Controller/AuthControl';

const AuthRoute = express.Router();

AuthRoute.post('/register', register);
AuthRoute.post('/login', login);

export default AuthRoute;