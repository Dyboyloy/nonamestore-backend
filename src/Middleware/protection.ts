// Protection for routes that require authentication
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface User {
    id: string;
    role: string;
}

export const protect = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.signedCookies['x-auth-token']; // Use signed cookies to prevent tampering
    if (!authHeader) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader
    try {
        // decode the cookie token with it cookie secret and then verify the decoded token with the jwt secret
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string, role: string };
        // @ts-ignore
        req.user = { id: payload.userId, role: payload.role }; // Attach user info to the request object
        next();
    } catch (err) {
        res.clearCookie('x-auth-token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', signed: true });
        return res.status(401).json({ message: 'Invalid token', error: (err as Error).message });
    }
};