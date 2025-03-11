// src/services/tokenService.ts
import jwtDecode, { JwtPayload } from 'jwt-decode';

interface CustomJwtPayload extends JwtPayload {
  id: string;
  username: string;
  email: string;
  role: string;
}

class TokenService {
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  removeToken(): void {
    localStorage.removeItem('token');
  }

  getDecodedToken(): CustomJwtPayload | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      return jwtDecode<CustomJwtPayload>(token);
    } catch (error) {
      console.error('Invalid token format', error);
      this.removeToken();
      return null;
    }
  }

  isTokenValid(): boolean {
    const decodedToken = this.getDecodedToken();
    if (!decodedToken) return false;

    // Check if the token has expired
    const currentTime = Date.now() / 1000;
    return decodedToken.exp ? decodedToken.exp > currentTime : false;
  }

  getAuthHeader(): Record<string, string> {
    const token = this.getToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

  // Get remaining time in seconds before token expires
  getTokenRemainingTime(): number {
    const decodedToken = this.getDecodedToken();
    if (!decodedToken || !decodedToken.exp) return 0;

    const currentTime = Date.now() / 1000;
    const remainingTime = decodedToken.exp - currentTime;

    return remainingTime > 0 ? Math.floor(remainingTime) : 0;
  }

  // Check if token needs refresh (e.g., less than 5 minutes remaining)
  shouldRefreshToken(thresholdSeconds: number = 300): boolean {
    return this.getTokenRemainingTime() < thresholdSeconds;
  }
}

export default new TokenService();