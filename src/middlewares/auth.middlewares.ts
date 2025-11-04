import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";

// create payload interface
interface DecodeToken extends JwtPayload {
  _id: string;
  name: string;
  email: string;
}

// overwrite the request interface from express
declare global {
  namespace Express {
    interface Request {
      user?: DecodeToken;
    }
  }
}

// auth middleware
export const authMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ Message: "Authorization token is missing or invalid format" });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ Message: "Token is missing" });
    }

    try {
      // verify token
      const decode = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_KEY!
      ) as DecodeToken;

      if (!decode._id) {
        return res.status(403).json({ Message: "Invalid token type" });
      }

      req.user = decode;
      next();
    } catch (error) {
      return res.status(401).json({ Message: "Invalid or expired token" });
    }
  }
);
export const authMiddlewareForWeb = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    console.log(req.cookies);
    // console.log(res.cookies);
    
    if (!req.cookies?.accessToken)
      return res.status(401).json({ Message: "Token is missing" });
    let token = req.cookies?.accessToken;
    try {
      // verify token
      const decode = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_KEY!
      ) as DecodeToken;

      if (!decode._id) {
        return res.status(403).json({ Message: "Invalid token type" });
      }

      req.user = decode;
      next();
    } catch (error) {
      return res.status(401).json({ Message: "Invalid or expired token" });
    }
  }
);
