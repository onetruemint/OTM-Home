import axios, { AxiosInstance } from "axios";

export interface KeycloakConfig {
  baseUrl: string;
  realm: string;
  clientId: string;
  clientSecret?: string;
}

export interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
  id_token?: string;
  session_state?: string;
  scope: string;
}

export interface UserInfo {
  sub: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
}

export class KeycloakClient {
  private config: KeycloakConfig;
  private httpClient: AxiosInstance;
  private baseRealmUrl: string;

  constructor(config: KeycloakConfig) {
    this.config = config;
    this.baseRealmUrl = `${config.baseUrl}/realms/${config.realm}`;
    this.httpClient = axios.create({
      baseURL: this.baseRealmUrl,
    });
  }

  /**
   * Authenticate with username and password (Resource Owner Password Credentials flow)
   */
  async authenticateWithPassword(
    username: string,
    password: string
  ): Promise<TokenResponse> {
    const params = new URLSearchParams({
      grant_type: "password",
      client_id: this.config.clientId,
      username,
      password,
    });

    if (this.config.clientSecret) {
      params.append("client_secret", this.config.clientSecret);
    }

    const response = await this.httpClient.post<TokenResponse>(
      "/protocol/openid-connect/token",
      params,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    return response.data;
  }

  /**
   * Exchange authorization code for tokens (Authorization Code flow)
   */
  async exchangeCodeForToken(
    code: string,
    redirectUri: string
  ): Promise<TokenResponse> {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.config.clientId,
      code,
      redirect_uri: redirectUri,
    });

    if (this.config.clientSecret) {
      params.append("client_secret", this.config.clientSecret);
    }

    const response = await this.httpClient.post<TokenResponse>(
      "/protocol/openid-connect/token",
      params,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    return response.data;
  }

  /**
   * Refresh an access token using a refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.config.clientId,
      refresh_token: refreshToken,
    });

    if (this.config.clientSecret) {
      params.append("client_secret", this.config.clientSecret);
    }

    const response = await this.httpClient.post<TokenResponse>(
      "/protocol/openid-connect/token",
      params,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    return response.data;
  }

  /**
   * Get user information from an access token
   */
  async getUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await this.httpClient.get<UserInfo>(
      "/protocol/openid-connect/userinfo",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    return response.data;
  }

  /**
   * Verify and decode a JWT token
   */
  async verifyToken(token: string): Promise<any> {
    const response = await this.httpClient.post(
      "/protocol/openid-connect/token/introspect",
      new URLSearchParams({
        token,
        client_id: this.config.clientId,
        ...(this.config.clientSecret && {
          client_secret: this.config.clientSecret,
        }),
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    return response.data;
  }

  /**
   * Logout a user session
   */
  async logout(refreshToken: string): Promise<void> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      refresh_token: refreshToken,
    });

    if (this.config.clientSecret) {
      params.append("client_secret", this.config.clientSecret);
    }

    await this.httpClient.post("/protocol/openid-connect/logout", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  }

  /**
   * Get the authorization URL for the authorization code flow
   */
  getAuthorizationUrl(redirectUri: string, state?: string, scope = "openid"): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope,
      ...(state && { state }),
    });

    return `${this.baseRealmUrl}/protocol/openid-connect/auth?${params.toString()}`;
  }

  /**
   * Get the realm's public keys for JWT verification
   */
  async getPublicKeys(): Promise<any> {
    const response = await this.httpClient.get(
      "/protocol/openid-connect/certs"
    );
    return response.data;
  }
}
