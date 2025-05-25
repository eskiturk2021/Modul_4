// src/utils/apiAdapter.ts
// Универсальный адаптер для API ответов

interface ApiResponse {
  [key: string]: any;
}

interface ProcessedData<T = any> {
  data: T[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    from: number;
    to: number;
    total: number;
  };
  meta?: {
    originalStructure: string;
    detectedFields: string[];
  };
}

export class ApiAdapter {
  /**
   * Универсальная обработка ответа API для извлечения массива данных
   */
  static processResponse<T = any>(response: any): ProcessedData<T> {
    console.log('🔄 ApiAdapter: Обработка ответа API:', response);

    let data: T[] = [];
    let pagination: any = {};
    let originalStructure = 'unknown';

    try {
      const responseData = response?.data || response;

      // Случай 1: response.data.customers
      if (responseData?.customers && Array.isArray(responseData.customers)) {
        data = responseData.customers;
        pagination = responseData.pagination || {};
        originalStructure = 'nested_customers';
        console.log('✅ Найдены данные в response.data.customers');
      }
      // Случай 2: response.data.data
      else if (responseData?.data && Array.isArray(responseData.data)) {
        data = responseData.data;
        pagination = responseData.pagination || {};
        originalStructure = 'nested_data';
        console.log('✅ Найдены данные в response.data.data');
      }
      // Случай 3: response.data является массивом
      else if (Array.isArray(responseData)) {
        data = responseData;
        pagination = this.generateDefaultPagination(responseData.length);
        originalStructure = 'direct_array';
        console.log('✅ response.data является массивом');
      }
      // Случай 4: Поиск массива в любом поле верхнего уровня
      else if (responseData && typeof responseData === 'object') {
        for (const [key, value] of Object.entries(responseData)) {
          if (Array.isArray(value) && value.length > 0) {
            // Проверяем, похож ли это массив на данные (а не на мета-информацию)
            const firstItem = value[0];
            if (firstItem && typeof firstItem === 'object' && !Array.isArray(firstItem)) {
              data = value;
              pagination = responseData.pagination || this.generateDefaultPagination(value.length);
              originalStructure = `field_${key}`;
              console.log(`✅ Найдены данные в поле: ${key}`);
              break;
            }
          }
        }
      }

      // Если данные всё ещё не найдены, пробуем более глубокий поиск
      if (data.length === 0 && responseData) {
        const foundData = this.deepSearchForArray(responseData);
        if (foundData) {
          data = foundData.data;
          pagination = foundData.pagination || this.generateDefaultPagination(foundData.data.length);
          originalStructure = foundData.path;
          console.log(`✅ Найдены данные при глубоком поиске: ${foundData.path}`);
        }
      }

    } catch (error) {
      console.error('❌ Ошибка при обработке ответа API:', error);
    }

    const detectedFields = data.length > 0 ? Object.keys(data[0]) : [];

    console.log('📊 Результат обработки:', {
      dataLength: data.length,
      originalStructure,
      detectedFields: detectedFields.slice(0, 10), // Первые 10 полей
      pagination
    });

    return {
      data,
      pagination,
      meta: {
        originalStructure,
        detectedFields
      }
    };
  }

  /**
   * Глубокий поиск массива в объекте
   */
  private static deepSearchForArray(obj: any, path = '', maxDepth = 3): { data: any[], path: string, pagination?: any } | null {
    if (maxDepth <= 0) return null;

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (Array.isArray(value) && value.length > 0) {
        const firstItem = value[0];
        if (firstItem && typeof firstItem === 'object' && !Array.isArray(firstItem)) {
          return {
            data: value,
            path: currentPath,
            pagination: obj.pagination
          };
        }
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        const nested = this.deepSearchForArray(value, currentPath, maxDepth - 1);
        if (nested) return nested;
      }
    }

    return null;
  }

  /**
   * Генерирует пагинацию по умолчанию для массива
   */
  private static generateDefaultPagination(totalItems: number) {
    return {
      currentPage: 1,
      totalPages: 1,
      from: totalItems > 0 ? 1 : 0,
      to: totalItems,
      total: totalItems
    };
  }

  /**
   * Анализирует структуру данных и возвращает информацию о полях
   */
  static analyzeDataStructure(data: any[]): {
    fields: string[];
    fieldTypes: { [key: string]: string };
    sampleData: any;
  } {
    if (!data || data.length === 0) {
      return { fields: [], fieldTypes: {}, sampleData: null };
    }

    const sampleData = data[0];
    const fields = Object.keys(sampleData);
    const fieldTypes: { [key: string]: string } = {};

    fields.forEach(field => {
      const value = sampleData[field];
      if (value === null || value === undefined) {
        fieldTypes[field] = 'null';
      } else if (typeof value === 'string') {
        if (field.includes('date') || field.includes('time')) {
          fieldTypes[field] = 'date';
        } else if (field.includes('email')) {
          fieldTypes[field] = 'email';
        } else if (field.includes('phone')) {
          fieldTypes[field] = 'phone';
        } else {
          fieldTypes[field] = 'string';
        }
      } else if (typeof value === 'number') {
        fieldTypes[field] = 'number';
      } else if (typeof value === 'boolean') {
        fieldTypes[field] = 'boolean';
      } else if (typeof value === 'object') {
        fieldTypes[field] = 'object';
      } else {
        fieldTypes[field] = typeof value;
      }
    });

    return { fields, fieldTypes, sampleData };
  }

  /**
   * Форматирует данные для отображения в таблице
   */
  static formatForTable(data: any[], options?: {
    excludeFields?: string[];
    includeFields?: string[];
    customFormatters?: { [key: string]: (value: any) => any };
  }) {
    if (!data || data.length === 0) return [];

    const { excludeFields = [], includeFields = [], customFormatters = {} } = options || {};

    return data.map(item => {
      const formattedItem: any = {};

      Object.entries(item).forEach(([key, value]) => {
        // Пропускаем исключенные поля
        if (excludeFields.includes(key)) return;

        // Если указаны конкретные поля, включаем только их
        if (includeFields.length > 0 && !includeFields.includes(key)) return;

        // Применяем кастомный форматтер, если есть
        if (customFormatters[key]) {
          formattedItem[key] = customFormatters[key](value);
        } else {
          formattedItem[key] = value;
        }
      });

      return formattedItem;
    });
  }
}