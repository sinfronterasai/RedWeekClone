import type { Request, Response, NextFunction } from "express";

// Extend the Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
        role: string;
        firstName: string;
        lastName: string;
      };
    }
  }
}

// Session-based authentication middleware
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  // Check if user is in session (we'll use a simple session store)
  const userId = (req as any).session?.userId;
  
  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    // Import storage here to avoid circular dependency
    const { storage } = await import('./storage');
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Attach user to request (excluding password)
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Authentication error' });
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  next();
};

export const requireEscrowVendor = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  if (req.user.role !== 'escrow_vendor' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Escrow vendor access required' });
  }

  next();
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  next();
};