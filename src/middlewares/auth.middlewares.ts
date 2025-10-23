import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";

// create payload interface
interface DecodeToken extends JwtPayload {
  _id: string;
  name: string;
  email: string;
}

// cookies interface
interface AuthCookies {
  accessToken?: string;
  refreshToken?: string;
}

// overwrite the request interface from express
declare global {
  namespace Express {
    interface Request {
      user?: DecodeToken;
      cookies?: AuthCookies;
    }
  }
}

// auth middleware
export const authMiddleware = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const isExistAuthToken = req.headers.authorization;
    let token;

    if (isExistAuthToken && isExistAuthToken.startsWith("Bearer "))
      token = isExistAuthToken.split(" ")[1];
    else if (req.cookies?.accessToken) token = req.cookies.accessToken;

    if (!token) return res.status(401).json({ message: "Token is missing" });

    // verify token
    const decode = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_KEY!
    ) as DecodeToken;

    if (!decode._id)
      return res.status(403).json({ message: "Invalid token type" });
    req.user = decode;
    next();
  }
);
