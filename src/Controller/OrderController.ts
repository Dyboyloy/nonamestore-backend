import { Response, NextFunction } from "express";
import { prisma } from "../lib/PrismaClient";
import { ProtectedRequest } from "../Services/ProtectRequest"; 

// Get all seller's products orders
export const getSellerOrder = async (req: ProtectedRequest, res: Response, next: NextFunction) => {
    try {
        //Get user id
        const sellerId = req.user?.id;
        
        if (!req.user) return res.status(401).json({ status: 'error', message: 'Unauthoritzed' });

         // Check if the user id has a seller role
        if (req.user?.role !== 'SELLER') return res.status(403).json({ status: 'error', message: 'Forbidden: Only sellers can check the order'});

        const order = await prisma.order.findMany({
            where: {
                product: {
                    userId: sellerId
                }
            },
            include: {
                product: true,
                user: {
                    select: { id: true, username: true },
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return res.status(200).json({ status: 'success', order: order });
    } catch (err) {
        return res.status(500).json({ status: 'error', error: (err as Error).message});
    }
};

// Get order via id
export const getOrderById = async (req: ProtectedRequest, res: Response, next: NextFunction) => {
    try {
        // Get order id
        const { id } = req.params;

        if (!req.user) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
        if (!id) return res.status(403).json({ status: 'error', message: 'Please provide the order id' });

        // Check if the user is a seller
        if (req.user?.role !== 'SELLER') return res.status(403).json({ status: 'error', message: 'Forbidden: Only sellers can check the order '});

        const order = await prisma.order.findUnique({
            where: {
                id: id as string,
            }
        })

        return res.status(200).json({ status: 'success', data: order });
    } catch (err) {
        return res.status(500).json({ status: 'error', error: (err as Error).message });
    }
}

// Update order status via its id
export const updateOrderStatus = async (req: ProtectedRequest, res: Response, next: NextFunction) => {
    try {
        // Get order id
        const { id } = req.params;
        // Get status from body
        const status = req.body;

        if (!req.user) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

        if (req.user?.role !== 'SELLER') return res.status(403).json({ status: 'error', message: 'Forbidden: Only sellers can you this route' });
        // Check if the order exist
        const order = await prisma.order.findUnique({
            where: { id: id as string },
        });

        if (!order) return res.status(404).json({ status: 'error', message: 'Order is not found' });

        const updateOrder = await prisma.order.update({
            where: {
                id: id as string,
            },
            data: {
                status: status
            }
        });

        return res.status(200).json({ status: 'success', data: updateOrder });
    } catch (err) {
        return res.status(500).json({ status: 'error', error: (err as Error).message });
    }
};
