import { AuthenticatedUser } from './index';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userInfo?: AuthenticatedUser;
      business?: string;
    }
  }
}

export {};
