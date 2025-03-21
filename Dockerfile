# Этап сборки
FROM node:18-alpine AS build

WORKDIR /app

# Логирование начала сборки
RUN echo "🚀 Начало процесса сборки..."

# Копирование файла зависимостей
COPY package.json ./
RUN echo "📦 Файл package.json скопирован"

# Установка зависимостей
RUN echo "📥 Установка зависимостей..."
RUN npm install --legacy-peer-deps
RUN echo "✅ Зависимости установлены"

# Копирование исходного кода
RUN echo "📂 Копирование исходного кода..."
COPY . .
RUN echo "✅ Исходный код скопирован"

# Проверка структуры проекта
RUN echo "🔍 Проверка структуры проекта:"
RUN ls -la
RUN echo "📄 Содержимое tsconfig.json:"
RUN cat tsconfig.json

# Проверка конфигурации Vite
RUN echo "📄 Содержимое vite.config.ts:"
RUN cat vite.config.ts

# Сборка приложения (сохраняем оригинальную команду)
RUN echo "🏗️ Начало сборки приложения..."
RUN npm run build || (cat /app/tsconfig.json && ls -la && exit 1)
RUN echo "✅ Приложение успешно собрано"

# Проверка результатов сборки
RUN echo "🔍 Проверка результатов сборки:"
RUN ls -la dist/
RUN echo "📄 Структура JS файлов:"
RUN find dist -name "*.js" | sort
RUN echo "📄 Структура CSS файлов:"
RUN find dist -name "*.css" | sort

# Создание диагностического скрипта
RUN echo '#!/bin/sh
echo "====================== ДИАГНОСТИКА КОНТЕЙНЕРА ======================"
echo "Версия Node.js: $(node -v)"
echo "Версия npm: $(npm -v)"
echo "Структура каталогов:"
find /app -type d -maxdepth 3 | sort
echo "Файлы конфигурации:"
find /app -name "*.json" -o -name "*.js" -o -name "*.ts" | grep -v "node_modules" | sort
echo "=================================================================="
' > /app/diagnose.sh
RUN chmod +x /app/diagnose.sh
RUN /app/diagnose.sh

# Этап production
FROM nginx:alpine AS production
RUN echo "🚀 Начало настройки production-окружения..."

# Копирование собранных файлов из этапа сборки
COPY --from=build /app/dist /usr/share/nginx/html
RUN echo "✅ Файлы собранного приложения скопированы в nginx"

# Создание конфигурации nginx (сохраняем оригинальную конфигурацию)
RUN echo "⚙️ Настройка конфигурации Nginx..."
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf
RUN echo "✅ Конфигурация Nginx создана"

# Проверка конфигурации
RUN echo "🔍 Проверка созданной конфигурации Nginx:"
RUN cat /etc/nginx/conf.d/default.conf

# Проверка файлов в Nginx
RUN echo "🔍 Проверка файлов в директории Nginx:"
RUN ls -la /usr/share/nginx/html

# Создание скрипта для проверки доступности ресурсов
RUN echo '#!/bin/sh
echo "Проверка доступности основных ресурсов..."
for file in /usr/share/nginx/html/index.html $(find /usr/share/nginx/html -name "*.js" -o -name "*.css")
do
  if [ -f "$file" ]; then
    echo "✅ Файл $file существует"
    echo "   Размер: $(ls -lh $file | awk '"'"'{print $5}'"'"')"
  else
    echo "❌ Файл $file НЕ найден"
  fi
done

echo "Проверка содержимого index.html:"
head -n 20 /usr/share/nginx/html/index.html
echo "..."
' > /docker-entrypoint.d/check-assets.sh
RUN chmod +x /docker-entrypoint.d/check-assets.sh

# Создание скрипта для включения gzip и правильной обработки статических ресурсов
RUN echo 'server {
    listen 80;

    # Включение gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Правильные заголовки для статических ресурсов
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        root /usr/share/nginx/html;
        expires max;
        add_header Cache-Control "public, max-age=31536000";
    }

    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}' > /etc/nginx/conf.d/default.conf.new
RUN echo "📄 Новая конфигурация Nginx с gzip и обработкой статических ресурсов создана"

# Открываем порт
EXPOSE 80
RUN echo "🌐 Порт 80 открыт"

# Запуск nginx (сохраняем оригинальную команду)
CMD ["nginx", "-g", "daemon off;"]