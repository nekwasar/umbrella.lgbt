import jwt from 'jsonwebtoken';
import { config } from '../config';

export type TokenKind = 'admin' | 'user';

export interface TokenPayload {
  /** subject — admin or user id */
  sub: string;
  kind: TokenKind;
  username: string;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn']
  });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
}
