import jwt, { type SignOptions } from "jsonwebtoken";

const getJwtSecret = () => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT not configured yet");
  }
  return jwtSecret;
};

// Generate token
export const generateToken = (payload: object, expiresIn: SignOptions['expiresIn'] = "1d") => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
};

export const verifyToken = <T>(token: string): T => {
  return jwt.verify(token, getJwtSecret()) as T;
};