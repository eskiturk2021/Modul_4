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

# Создание диагностического скрипта (исправленная версия - с написанием строк по отдельности)
RUN touch /app/diagnose.sh && \
    echo '#!/bin/sh' > /app/diagnose.sh && \
    echo 'echo "====================== ДИАГНОСТИКА КОНТЕЙНЕРА ======================"' >> /app/diagnose.sh && \
    echo 'echo "Версия Node.js: $(node -v)"' >> /app/diagnose.sh && \
    echo 'echo "Версия npm: $(npm -v)"' >> /app/diagnose.sh && \
    echo 'echo "Структура каталогов:"' >> /app/diagnose.sh && \
    echo 'find /app -type d -maxdepth 3 | sort' >> /app/diagnose.sh && \
    echo 'echo "Файлы конфигурации:"' >> /app/diagnose.sh && \
    echo 'find /app -name "*.json" -o -name "*.js" -o -name "*.ts" | grep -v "node_modules" | sort' >> /app/diagnose.sh && \
    echo 'echo "=================================================================="' >> /app/diagnose.sh && \
    chmod +x /app/diagnose.sh && \
    cat /app/diagnose.sh

# Выполняем диагностику
RUN /bin/sh /app/diagnose.sh

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

# Создание скрипта для проверки доступности ресурсов (исправленная версия)
RUN touch /docker-entrypoint.d/check-assets.sh && \
    echo '#!/bin/sh' > /docker-entrypoint.d/check-assets.sh && \
    echo 'echo "Проверка доступности основных ресурсов..."' >> /docker-entrypoint.d/check-assets.sh && \
    echo 'for file in /usr/share/nginx/html/index.html $(find /usr/share/nginx/html -name "*.js" -o -name "*.css")' >> /docker-entrypoint.d/check-assets.sh && \
    echo 'do' >> /docker-entrypoint.d/check-assets.sh && \
    echo '  if [ -f "$file" ]; then' >> /docker-entrypoint.d/check-assets.sh && \
    echo '    echo "✅ Файл $file существует"' >> /docker-entrypoint.d/check-assets.sh && \
    echo '    echo "   Размер: $(ls -lh $file | awk '\''{print $5}'\''"' >> /docker-entrypoint.d/check-assets.sh && \
    echo '  else' >> /docker-entrypoint.d/check-assets.sh && \
    echo '    echo "❌ Файл $file НЕ найден"' >> /docker-entrypoint.d/check-assets.sh && \
    echo '  fi' >> /docker-entrypoint.d/check-assets.sh && \
    echo 'done' >> /docker-entrypoint.d/check-assets.sh && \
    echo 'echo "Проверка содержимого index.html:"' >> /docker-entrypoint.d/check-assets.sh && \
    echo 'head -n 20 /usr/share/nginx/html/index.html' >> /docker-entrypoint.d/check-assets.sh && \
    echo 'echo "..."' >> /docker-entrypoint.d/check-assets.sh && \
    chmod +x /docker-entrypoint.d/check-assets.sh

# Создание улучшенной конфигурации Nginx с gzip
RUN echo 'server {' > /etc/nginx/conf.d/default.conf.new && \
    echo '    listen 80;' >> /etc/nginx/conf.d/default.conf.new && \
    echo '' >> /etc/nginx/conf.d/default.conf.new && \
    echo '    # Включение gzip' >> /etc/nginx/conf.d/default.conf.new && \
    echo '    gzip on;' >> /etc/nginx/conf.d/default.conf.new && \
    echo '    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;' >> /etc/nginx/conf.d/default.conf.new && \
    echo '' >> /etc/nginx/conf.d/default.conf.new && \
    echo '    # Правильные заголовки для статических ресурсов' >> /etc/nginx/conf.d/default.conf.new && \
    echo '    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {' >> /etc/nginx/conf.d/default.conf.new && \
    echo '        root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf.new && \
    echo '        expires max;' >> /etc/nginx/conf.d/default.conf.new && \
    echo '        add_header Cache-Control "public, max-age=31536000";' >> /etc/nginx/conf.d/default.conf.new && \
    echo '    }' >> /etc/nginx/conf.d/default.conf.new && \
    echo '' >> /etc/nginx/conf.d/default.conf.new && \
    echo '    location / {' >> /etc/nginx/conf.d/default.conf.new && \
    echo '        root /usr/share/nginx/html;' >> /etc/nginx/conf.d/default.conf.new && \
    echo '        index index.html;' >> /etc/nginx/conf.d/default.conf.new && \
    echo '        try_files $uri $uri/ /index.html;' >> /etc/nginx/conf.d/default.conf.new && \
    echo '    }' >> /etc/nginx/conf.d/default.conf.new && \
    echo '}' >> /etc/nginx/conf.d/default.conf.new && \
    echo "📄 Новая конфигурация Nginx с gzip и обработкой статических ресурсов создана"

# Открываем порт
EXPOSE 80
RUN echo "🌐 Порт 80 открыт"

# Запуск nginx (сохраняем оригинальную команду)
CMD ["nginx", "-g", "daemon off;"]