import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/PrismaClient";
import { string, z } from "zod";
import ProductRoute from "../Router/ProductRoute";

interface ProtectedRequest extends Request {
    user?: {
        id: string;
        role: string;
    }
};

const createProductSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
    price: z.number().positive("Price must be a positive number"),
    categoryName: z.string().min(1, "Category name is required").optional(),
    categoryId: z.string().optional()
});

const updateProductSchema = z.object({
    name: z.string().min(1, "Name is required").optional(),
    description: z.string().optional(),
    price: z.number().positive("Price must be a positive number").optional(),
    categoryId: z.string()
});


// Get all products via query parameters
export const getProducts = async (req: ProtectedRequest, res: Response, next: NextFunction) => {
    try {
        const { name, minPrice, maxPrice, page, limit } = req.query;
        const pageNumber = parseInt(page as string) || 1;
        const pageSize = parseInt(limit as string) || 10;
        const skip = (pageNumber - 1) * pageSize;

        const where: any = {};

        if (!req.user) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }

        if (name) {
            where.name = { contains: name as string, mode: 'insensitive' };
        }
        if (minPrice) {
            where.price = { ...where.price, gte: parseFloat(minPrice as string) };
        }
        if (maxPrice) {
            where.price = { ...where.price, lte: parseFloat(maxPrice as string) };
        }

        const products = await prisma.product.findMany({
            where,
            skip,
            take: pageSize,
        });

        if (products.length === 0) {
            return res.status(404).json({ status: 'error', message: 'No products found' });
        }

        return res.status(200).json({ status: 'success', data: products });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: (err as Error).message });
    }
};

// Get all the products of the authenticated user
export const getSellerProducts = async (req: ProtectedRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }

        const products = await prisma.product.findMany({
            where: { userId: req.user.id },
        });

        if (products.length === 0) {
            return res.status(404).json({ status: 'error', message: 'No products found for this user' });
        }

        return res.status(200).json({ status: 'success', data: products });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: (err as Error).message });
    }
};

// Get a single product by ID
export const getProductById = async (req: ProtectedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        if (!req.user) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }

        const product = await prisma.product.findUnique({
            where: { id: id as string },
        });

        if (!product) {
            return res.status(404).json({ status: 'error', message: 'Product not found' });
        }

        return res.status(200).json({ status: 'success', data: product });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: (err as Error).message });
    }
};

// Get recommended products for user based on purchase history
export const getRecommendedProducts = async (req: ProtectedRequest, res: Response, next: NextFunction) => {
    try {
        // Get purchased history of a user
        const userId = req.user?.id;
        const purchaseProducts = await prisma.purchase.findMany({
            where: {
                userId: userId
            },
            select: {
                productId: true
            }
        }).then(res => res.map(r => r.productId));
        // Find similar users
        const similarUsers = await prisma.purchase.groupBy({
            by: ['userId'],
            where: {
                productId: { in: purchaseProducts},
                userId: { not: userId }
            },
            _count: { productId: true },
            orderBy: { _count: { productId: 'desc' } },
            take: 50,
        });

        const similarUserId = similarUsers.map(u => u.userId);

        // Get recommends products
        const recommendations = await prisma.purchase.groupBy({
            by: ['productId'],
            where: {
                userId: { in: similarUserId },
                productId: { notIn: purchaseProducts }
            },
            _count: { productId: true },
            orderBy: { _count: { productId: 'desc' } },
            take: 50
        });

        const recommendedId = recommendations.map(r => r.productId);

        const recommendedProducts = await prisma.product.findMany({
            where: { id: { in: recommendedId } },
            include: { categories: true }
        })

        return res.status(200).json({ status: 'success', products: recommendedProducts });
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
};

// Get user purchases history
export const getUserPurchaseHistory = async (req: ProtectedRequest, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.id;

        const purchases = await prisma.purchase.findMany({
            where: { userId },
            include: {
                product: {
                    select: {
                        id: true,
                        name: true,
                        price: true,
                    }
                },
            },
        });

        if (purchases.length === 0) {
            return res.status(404).json({ message: 'No purchase history found for user' });
        }

        res.status(200).json(purchases);
    } catch (error) {
        return res.status(500).json({ message: 'Server error', error: (error as Error).message });
    }
};

// Create a new product
export const createProduct = async (req: ProtectedRequest, res: Response, next: NextFunction) => {
    try {
        const { name, description, price, categoryId: parsedCategoryId, categoryName } = createProductSchema.parse(req.body) as any;

        if (!req.user) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }

        // Get the user role from the database
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { profile: { select: { role: true } } },
        });

        if (user?.profile?.role !== 'SELLER') {
            return res.status(403).json({ status: 'error', message: 'Forbidden: Only sellers can create products' });
        }

        // Create category if categoryId is not provided but the category name is provided
        let finalCategoryId: string | undefined = undefined;
        if (parsedCategoryId) {
            const existingCategory = await prisma.category.findUnique({
                where: { id: parsedCategoryId },
            });

            if (!existingCategory) {
                return res.status(400).json({ status: 'error', message: 'Invalid category ID' });
            }

            finalCategoryId = parsedCategoryId;
        } else if (categoryName) {
            // Create new category and get the category id
            const category = await prisma.category.create({
                data: {
                    name: categoryName
                }
            });

            finalCategoryId = category.id;
        };

        const newProduct = await prisma.product.create({
            data: {
                name,
                description,
                price,
                originalPrice: price, // Store the original price when creating the product
                userId: req.user.id,
                ...(finalCategoryId && {
                    categories: {
                        connect: {
                            id: finalCategoryId
                        }
                    }
                })
            },
        });

        return res.status(201).json({ status: 'success', data: newProduct });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: (err as Error).message });
    }
};

// Update a product by ID
export const updateProduct = async (req: ProtectedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { name, description, price } = updateProductSchema.parse(req.body) as any;
        
        if (!req.user) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }

        const product = await prisma.product.findUnique({
            where: { id: id as string },
        });

        if (!product) {
            return res.status(404).json({ status: 'error', message: 'Product not found' });
        }

        if (product.userId !== req.user.id && req.user.role !== 'SELLER') {
            return res.status(403).json({ status: 'error', message: 'Forbidden: You can only update your own products' });
        }

        const updatedProduct = await prisma.product.update({
            where: { id: id as string },
            data: {
                name,
                description,
                price,
            },
        });

        return res.status(200).json({ status: 'success', data: updatedProduct });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: (err as Error).message });
    }
};

// Add discount to a product by ID
export const addDiscount = async (req: ProtectedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const { discountPercentage } = req.body;

        if (!req.user) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }

        const product = await prisma.product.findUnique({
            where: { id: id as string },
        });

        if (!product) {
            return res.status(404).json({ status: 'error', message: 'Product not found' });
        }

        if (product.userId !== req.user.id && req.user.role !== 'SELLER') {
            return res.status(403).json({ status: 'error', message: 'Forbidden: You can only add discounts to your own products' });
        }

        const discountedPrice = product.price * (1 - discountPercentage / 100);

        // save the original price before update it
        if (product.price !== product.originalPrice) {
            return await prisma.product.update({
                where: { id: id as string },
                data: {
                    originalPrice: product.price
                }
            });
        }

        const updatedProduct = await prisma.product.update({
            where: { id: id as string },
            data: {
                price: discountedPrice,
            },
        });

        return res.status(200).json({ status: 'success', data: updatedProduct });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: (err as Error).message });
    }
};

// Remove discount from a product by ID (reset price to original)
export const removeDiscount = async (req: ProtectedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        if (!req.user) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }

        const product = await prisma.product.findUnique({
            where: { id: id as string },
        });

        if (!product) {
            return res.status(404).json({ status: 'error', message: 'Product not found' });
        }

        if (product.userId !== req.user.id && req.user.role !== 'SELLER') {
            return res.status(403).json({ status: 'error', message: 'Forbidden: You can only remove discounts from your own products' });
        }

        const originalPrice = product.originalPrice;

        // Remove the discount by resetting the price to the original price
        if (originalPrice === null) {
            return res.status(400).json({ status: 'error', message: 'No original price found for this product' });
        }

        const updatedProduct = await prisma.product.update({
            where: { id: id as string },
            data: {
                price: originalPrice,
            },
        });

        return res.status(200).json({ status: 'success', data: updatedProduct });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: (err as Error).message });
    }
};

// Delete a product by ID
export const deleteProduct = async (req: ProtectedRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;

        if (!req.user) {
            return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        }

        const product = await prisma.product.findUnique({
            where: { id: id as string },
        });

        if (!product) {
            return res.status(404).json({ status: 'error', message: 'Product not found' });
        }

        if (product.userId !== req.user.id && req.user.role !== 'SELLER') {
            return res.status(403).json({ status: 'error', message: 'Forbidden: You can only delete your own products' });
        }

        await prisma.product.delete({
            where: { id: id as string },
        });

        return res.status(200).json({ status: 'success', message: 'Product deleted successfully' });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: (err as Error).message });
    }
};