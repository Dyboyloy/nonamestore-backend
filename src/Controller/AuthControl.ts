import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/PrismaClient";
import { z } from "zod";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

// Function to generate JWT token
function generateToken(userId: string, role: string) {
    if (!JWT_SECRET) return null;
    return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "1h" });
}

// User registration schema validation
const registerSchema = z.object({
    username: z.string().min(3).max(20),
    email: z.string(),
    role: z.enum(['USER', 'ADMIN']).default('USER'),
    firstName: z.string().min(3).max(50),
    lastName: z.string().min(3).max(50),
    password: z.string().min(8),
});

// User login schema validation
const loginSchema = z.object({
    identifier: z.string(), // Can be either username or email
    password: z.string().min(8),
});

// User registration handler
export async function register(req: Request, res: Response, next: NextFunction) {
    try {
        const { username, email, role, firstName, lastName, password } = registerSchema.parse(req.body);

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: "Email already in use" });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const user = await prisma.user.create({
            data: {
                username,
                email,
                profile: {
                    create: {
                        firstName,
                        lastName,
                        role,
                    },
                },
                password: hashedPassword,
            },
        });

        const getRole = await prisma.profile.findUnique({
            where: { userId: user.id },
            select: { role: true },
        });

        // Generate JWT token
        const token = generateToken(user.id, getRole?.role || 'USER');
        if (!token) {
            return res.status(500).json({ message: "Failed to generate token" });
        }

        // Return the token to the client via cookie
        res.cookie('x-auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000, // 1 hour
            domain: process.env.NODE_ENV === 'production' ? 'yourdomain.com' : 'localhost', // Set domain for production
            signed: true, // Sign the cookie to prevent tampering
        })

        res.status(201).json({ msg: "User registered successfully" });
    } catch (err) {
        return res.status(500).json({ message: "Registration failed", error: err instanceof Error ? err.message : String(err) });
    }
}

// User login handler
export async function login(req: Request, res: Response, next: NextFunction) {
    try {
        const { identifier, password } = loginSchema.parse(req.body);

        // Find user by email or username
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier },
                ],
            },
        });

        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const getRole = await prisma.profile.findUnique({
            where: { userId: user.id },
            select: { role: true },
        });

        // Generate JWT token
        const token = generateToken(user.id, getRole?.role || 'USER');
        if (!token) {
            return res.status(500).json({ message: "Failed to generate token" });
        }

        // Return the token to the client via cookie
        res.cookie('x-auth-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000, // 1 hour
            domain: process.env.NODE_ENV === 'production' ? 'yourdomain.com' : 'localhost', // Set domain for production
            signed: true, // Sign the cookie to prevent tampering
        });

        res.status(200).json({ msg: "Login successful" });
    } catch (err) {
        return res.status(500).json({ message: "Login failed", error: err instanceof Error ? err.message : String(err) });
    }
};
