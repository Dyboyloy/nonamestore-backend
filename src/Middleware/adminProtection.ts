// protect admin-only routes
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/PrismaClient';

export const adminProtect = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.signedCookies['x-auth-token'];
    if (!authHeader) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { role: string, id: string };

        // check the role
        if (decoded.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden: Admins only' });
        }
        // @ts-ignore
        req.user = decoded; // Attach user info to request object
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token', error: (err as Error).message });
    }
};