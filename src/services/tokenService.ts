import { jwtDecode, JwtPayload } from 'jwt-decode';

interface CustomJwtPayload extends JwtPayload {
  id: string;
  username: string;
  email: string;
  role: string;
}

class TokenService {
  getToken(): string | null {
    try {
      const token = localStorage.getItem('token');
      console.log('[TokenService] Получен токен:', token);
      return token;
    } catch (error) {
      console.error('[TokenService] Ошибка доступа к localStorage:', error);
      return null;
    }
  }

  setToken(token: string): void {
    try {
      localStorage.setItem('token', token);
      console.log('[TokenService] Токен сохранен:', token);
    } catch (error) {
      console.error('[TokenService] Ошибка записи в localStorage:', error);
    }
  }

  removeToken(): void {
    try {
      localStorage.removeItem('token');
      console.log('[TokenService] Токен удален');
    } catch (error) {
      console.error('[TokenService] Ошибка удаления из localStorage:', error);
    }
  }

  hasToken(): boolean {
    return !!this.getToken();
  }

  getDecodedToken(): CustomJwtPayload | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const decoded = jwtDecode<CustomJwtPayload>(token);
      console.log('[TokenService] Декодированный токен:', decoded);
      return decoded;
    } catch (error) {
      console.error('[TokenService] Ошибка декодирования токена:', token, error);
      return null; // Не удаляем токен сразу, чтобы можно было разобраться
    }
  }

  isTokenValid(): boolean {
    const decodedToken = this.getDecodedToken();
    if (!decodedToken) return false;

    const currentTime = Date.now() / 1000;
    const isValid = decodedToken.exp ? decodedToken.exp > currentTime : false;

    console.log('[TokenService] Токен валиден:', isValid);
    return isValid;
  }

  getAuthHeader(): Record<string, string> {
    const token = this.getToken();
    // Если токен существует, возвращаем объект с заголовком Authorization
    // Если токена нет, возвращаем объект с пустым заголовком, чтобы соответствовать типу Record<string, string>
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : { "x-no-auth": "true" };

    console.log('[TokenService] Заголовки авторизации:', headers);
    return headers;
  }

  getTokenRemainingTime(): number {
    const decodedToken = this.getDecodedToken();
    if (!decodedToken || !decodedToken.exp) return 0;

    const currentTime = Date.now() / 1000;
    const remainingTime = decodedToken.exp - currentTime;

    console.log('[TokenService] Осталось времени у токена (сек):', remainingTime);
    return remainingTime > 0 ? Math.floor(remainingTime) : 0;
  }

  shouldRefreshToken(thresholdSeconds: number = 300): boolean {
    const needRefresh = this.getTokenRemainingTime() < thresholdSeconds;
    console.log('[TokenService] Нужно обновить токен:', needRefresh);
    return needRefresh;
  }
}

export default new TokenService();