import { Request, Response, NextFunction } from "express";
import { KeycloakClient } from "./KeycloakClient";

export interface AuthenticatedRequest extends Request {
  user?: any;
  token?: string;
}

/**
 * Express middleware factory to protect routes with Keycloak authentication
 */
export function createAuthMiddleware(keycloakClient: KeycloakClient) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided" });
      }

      const token = authHeader.substring(7);
      const tokenInfo = await keycloakClient.verifyToken(token);

      if (!tokenInfo.active) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      req.user = tokenInfo;
      req.token = token;

      return next();
    } catch (error) {
      return res.status(401).json({ error: "Authentication failed" });
    }
  };
}

/**
 * Middleware factory to check for specific roles
 */
export function requireRoles(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const userRoles = req.user.realm_access?.roles || [];
    const hasRole = roles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    return next();
  };
}
