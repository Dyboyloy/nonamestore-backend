import { Request } from "express"

interface ProtectedRequest extends Request {
    user?: {
        id: string,
        role: string,
    }
};

export { ProtectedRequest };