import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/PrismaClient';
import { z } from 'zod';

interface ProtectedRequest extends Request {
    user?: {
        id: string;
    };
}

// Edit user profile schema validation
export const editUserProfileSchema = z.object({
    username: z.string().min(3).max(30).optional(),
    email: z.string(),
    firstName: z.string().max(50).optional(),
    lastName: z.string().max(50).optional(),
});

// Get user profile
export const getUserProfile = async (req: ProtectedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const user = await prisma.user.findFirst({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                profile: {
                    select: {
                        firstName: true,
                        lastName: true,
                        role: true,
                    }
                },
            },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
};

// Update user profile
export const updateUserProfile = async (req: ProtectedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { username, email, firstName, lastName } = editUserProfileSchema.parse(req.body);

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                username,
                email,
                ...(firstName || lastName) && {
                    profile: {
                        update: {
                            ...(firstName && { firstName }),
                            ...(lastName && { lastName }),
                        }
                    }
                }
            },
            select: {
                id: true,
                email: true,
                username: true,
                profile: {
                    select: {
                        firstName: true,
                        lastName: true,
                    }
                },
                createdAt: true,
            },
        });

        res.status(200).json(updatedUser);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
};

// Update user password with verification code send to email
export const updateUserPassword = async (req: ProtectedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;
        const { currentPassword, newPassword } = req.body;

        if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length <= 8) {
            return res.status(400).json({ message: 'Invalid password format' });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Here you would normally verify the current password with a hashing function
        if (user.password !== currentPassword) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        await prisma.user.update({
            where: { id: userId },
            data: { password: newPassword }, // Hash the password in a real application
        });

        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
};


// Delete user account
export const deleteUserAccount = async (req: ProtectedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;

        await prisma.user.delete({
            where: { id: userId },
        });

        res.status(200).json({ message: 'User account deleted successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
};