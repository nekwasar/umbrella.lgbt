declare global {
  namespace Express {
    interface Request {
      authAdmin?: {
        id: string;
        username: string;
        role: 'SUPER_ADMIN' | 'ADMIN';
      };
      authUser?: {
        id: string;
        username: string;
      };
    }
  }
}

export {};
