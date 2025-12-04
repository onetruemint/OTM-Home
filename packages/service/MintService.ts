import express, { Express } from "express";
import * as https from "https";
import * as fs from "fs";
import { LoggerConfig, createLogger } from "../logger";
import {
  KeycloakClient,
  KeycloakConfig,
  createAuthMiddleware,
} from "@otm/auth";
import { errorHandler } from "../exceptions";
import KeycloakConnect from "keycloak-connect";
import cors = require("cors");

export interface MintExpressProps {
  serviceName: string;
  useKeycloak?: boolean;
  logger?: LoggerConfig;
  https?: boolean;
  httpsPort?: number;
  certPath?: string;
  keyPath?: string;
}

export interface MintExpressApp extends Express {
  keycloak?: KeycloakConnect.Keycloak;
}

export function MintService(props: MintExpressProps): MintExpressApp {
  const app = express() as MintExpressApp;

  // Initialize logger if provided
  if (props.logger) {
    const logger = createLogger(props.logger);
    logger.info(`Initializing ${props.serviceName}`);
  }

  // Setup CORS
  app.use(
    cors({
      origin: "*",
      credentials: true,
    }),
  );

  // Setup body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Setup Keycloak authentication if enabled
  if (props.useKeycloak) {
    const keycloakConfig: KeycloakConfig = {
      baseUrl: process.env.KEYCLOAK_URL || "",
      realm: process.env.KEYCLOAK_REALM || "master",
      clientId: process.env.KEYCLOAK_CLIENT_ID || "",
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
    };

    const keycloakClient = new KeycloakClient(keycloakConfig);
    app.keycloak = keycloakClient as unknown as KeycloakConnect.Keycloak;

    const authMiddleware = createAuthMiddleware(keycloakClient);
    app.use(authMiddleware);
  }

  // Setup error handling
  app.use(errorHandler);

  return app;
}

export function createHttpsServer(
  app: Express,
  props: MintExpressProps,
): https.Server {
  const certPath = props.certPath || process.env.SSL_CERT_PATH;
  const keyPath = props.keyPath || process.env.SSL_KEY_PATH;

  if (!certPath || !keyPath) {
    throw new Error(
      "SSL certificate and key paths are required. Set SSL_CERT_PATH and SSL_KEY_PATH environment variables or pass certPath and keyPath in props.",
    );
  }

  if (!fs.existsSync(certPath)) {
    throw new Error(`SSL certificate file not found at: ${certPath}`);
  }

  if (!fs.existsSync(keyPath)) {
    throw new Error(`SSL key file not found at: ${keyPath}`);
  }

  const httpsOptions = {
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  };

  return https.createServer(httpsOptions, app);
}
