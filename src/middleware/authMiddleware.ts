// src/middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from 'express';


export interface AuthenticatedRequest extends Request {
  user?: any; // Tu peux typer plus précisément avec un interface User si besoin
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  //desactivé pour le moment
  next();
};
