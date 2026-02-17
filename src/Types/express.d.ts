import { Request } from "express";

interface User {
    id: string;
    role: 'USER' | 'SELLER' | 'ADMIN';
}

declare module 'express-serve-static-core' {
    interface Request {
        user?: User;
    }
}

declare module 'express' {
    interface Request {
        signedCookies: {
            [key: string]: string | undefined;
        }
    }
}