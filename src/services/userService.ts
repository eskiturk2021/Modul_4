// src/services/userService.ts

/**
 * Сервис для работы с данными пользователя
 */
class UserService {
  private EMAIL_STORAGE_KEY = 'user_email';

  /**
   * Получает email-адрес из URL-параметров и сохраняет в localStorage
   */
  initializeUserEmail(): void {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const userEmail = urlParams.get('email');

      if (userEmail) {
        this.setUserEmail(userEmail);
        console.log('[UserService] Email пользователя инициализирован:', userEmail);
      } else {
        console.log('[UserService] Email пользователя не найден в URL параметрах');
      }
    } catch (error) {
      console.error('[UserService] Ошибка при инициализации email пользователя:', error);
    }
  }

  /**
   * Сохраняет email пользователя в localStorage
   */
  setUserEmail(email: string): void {
    try {
      localStorage.setItem(this.EMAIL_STORAGE_KEY, email);
    } catch (error) {
      console.error('[UserService] Ошибка при сохранении email пользователя:', error);
    }
  }

  /**
   * Получает email пользователя из localStorage
   */
  getUserEmail(): string | null {
    try {
      return localStorage.getItem(this.EMAIL_STORAGE_KEY);
    } catch (error) {
      console.error('[UserService] Ошибка при получении email пользователя:', error);
      return null;
    }
  }

  /**
   * Проверяет, есть ли сохраненный email пользователя
   */
  hasUserEmail(): boolean {
    return !!this.getUserEmail();
  }

  /**
   * Удаляет email пользователя из localStorage
   */
  clearUserEmail(): void {
    try {
      localStorage.removeItem(this.EMAIL_STORAGE_KEY);
    } catch (error) {
      console.error('[UserService] Ошибка при удалении email пользователя:', error);
    }
  }
}

export default new UserService();