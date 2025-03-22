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

# Сборка приложения в production режиме
RUN echo "🏗️ Начало сборки приложения в режиме production..."
RUN npx tsc --noEmit && echo "Проверка TypeScript успешна"
# Явно указываем режим production
RUN NODE_ENV=production npx vite build --mode production 2>&1 | tee build.log || (echo "Ошибка сборки Vite:" && cat build.log && exit 1)
RUN echo "✅ Приложение успешно собрано"

# Проверка результатов сборки
RUN echo "🔍 Проверка результатов сборки:"
RUN ls -la dist/
RUN echo "📄 Структура JS файлов:"
RUN find dist -name "*.js" | sort
RUN echo "📄 Структура CSS файлов:"
RUN find dist -name "*.css" | sort

# Создание диагностического скрипта
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

# Этап production - используем более легковесный образ
FROM nginx:alpine-slim AS production
RUN echo "🚀 Начало настройки production-окружения..."

# Копирование собранных файлов из этапа сборки
COPY --from=build /app/dist /usr/share/nginx/html
RUN echo "✅ Файлы собранного приложения скопированы в nginx"

# Копирование оптимизированного nginx.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Создание оптимизированной главной конфигурации nginx
RUN echo 'user nginx;' > /etc/nginx/nginx.conf && \
    echo 'worker_processes 2;' >> /etc/nginx/nginx.conf && \
    echo 'error_log /var/log/nginx/error.log warn;' >> /etc/nginx/nginx.conf && \
    echo 'pid /var/run/nginx.pid;' >> /etc/nginx/nginx.conf && \
    echo '' >> /etc/nginx/nginx.conf && \
    echo 'events {' >> /etc/nginx/nginx.conf && \
    echo '    worker_connections 1024;' >> /etc/nginx/nginx.conf && \
    echo '}' >> /etc/nginx/nginx.conf && \
    echo '' >> /etc/nginx/nginx.conf && \
    echo 'http {' >> /etc/nginx/nginx.conf && \
    echo '    include /etc/nginx/mime.types;' >> /etc/nginx/nginx.conf && \
    echo '    default_type application/octet-stream;' >> /etc/nginx/nginx.conf && \
    echo '    sendfile on;' >> /etc/nginx/nginx.conf && \
    echo '    keepalive_timeout 65;' >> /etc/nginx/nginx.conf && \
    echo '    aio off;' >> /etc/nginx/nginx.conf && \
    echo '    gzip on;' >> /etc/nginx/nginx.conf && \
    echo '    include /etc/nginx/conf.d/*.conf;' >> /etc/nginx/nginx.conf && \
    echo '}' >> /etc/nginx/nginx.conf

RUN echo "✅ Оптимизированная конфигурация Nginx создана"

# Проверка конфигурации
RUN echo "🔍 Проверка созданной конфигурации Nginx:"
RUN cat /etc/nginx/nginx.conf
RUN cat /etc/nginx/conf.d/default.conf

# Проверка файлов в Nginx
RUN echo "🔍 Проверка файлов в директории Nginx:"
RUN ls -la /usr/share/nginx/html

# Создание скрипта для проверки доступности ресурсов
RUN touch /docker-entrypoint.d/check-assets.sh && \
    echo '#!/bin/sh' > /docker-entrypoint.d/check-assets.sh && \
    echo 'echo "Проверка доступности основных ресурсов..."' >> /docker-entrypoint.d/check-assets.sh && \
    echo 'for file in /usr/share/nginx/html/index.html $(find /usr/share/nginx/html -name "*.js" -o -name "*.css")' >> /docker-entrypoint.d/check-assets.sh && \
    echo 'do' >> /docker-entrypoint.d/check-assets.sh && \
    echo '  if [ -f "$file" ]; then' >> /docker-entrypoint.d/check-assets.sh && \
    echo '    echo "✅ Файл $file существует"' >> /docker-entrypoint.d/check-assets.sh && \
    echo '    echo "   Размер: $(ls -lh $file | awk '"'"'{print $5}'"'"')"' >> /docker-entrypoint.d/check-assets.sh && \
    echo '  else' >> /docker-entrypoint.d/check-assets.sh && \
    echo '    echo "❌ Файл $file НЕ найден"' >> /docker-entrypoint.d/check-assets.sh && \
    echo '  fi' >> /docker-entrypoint.d/check-assets.sh && \
    echo 'done' >> /docker-entrypoint.d/check-assets.sh && \
    echo 'echo "Проверка содержимого index.html:"' >> /docker-entrypoint.d/check-assets.sh && \
    echo 'head -n 20 /usr/share/nginx/html/index.html' >> /docker-entrypoint.d/check-assets.sh && \
    echo 'echo "..."' >> /docker-entrypoint.d/check-assets.sh && \
    chmod +x /docker-entrypoint.d/check-assets.sh

# Копирование скрипта подстановки переменных окружения
COPY env.sh /docker-entrypoint.d/env.sh
RUN chmod +x /docker-entrypoint.d/env.sh

# Открываем порт
EXPOSE 80
RUN echo "🌐 Порт 80 открыт"

# Запуск nginx
CMD ["nginx", "-g", "daemon off;"]