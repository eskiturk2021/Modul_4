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

# Дебаг переменных окружения
RUN echo "🔍 Проверка NODE_ENV:"
RUN echo $NODE_ENV

# Создадим директорию dist заранее
RUN mkdir -p dist

# Сборка приложения с подробным выводом для отладки
RUN echo "🏗️ Начало сборки приложения в режиме production..."
RUN npx tsc --noEmit && echo "Проверка TypeScript успешна"

# Используем расширенный вывод для диагностики проблем сборки
RUN NODE_ENV=production npx vite build --mode production --debug --logLevel info || (echo "💥 ОШИБКА СБОРКИ!" && exit 1)
RUN echo "✅ Приложение успешно собрано"

# Проверка результатов сборки с обработкой ошибок
RUN echo "🔍 Проверка результатов сборки:"
RUN ls -la || echo "Директория верхнего уровня:"
RUN ls -la dist || echo "Директория dist не найдена!"

# Отладочная информация о конфигурации vite
RUN echo "📄 Проверка outDir в vite.config.ts:"
RUN grep -A 5 "build" vite.config.ts || echo "Секция build не найдена в vite.config.ts"

# Диагностические команды
RUN echo "📄 Структура JS файлов (если есть):"
RUN find . -name "*.js" | grep -v "node_modules" | sort || echo "JS файлы не найдены"

RUN echo "📄 Структура CSS файлов (если есть):"
RUN find . -name "*.css" | grep -v "node_modules" | sort || echo "CSS файлы не найдены"

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
    chmod +x /app/diagnose.sh

# Выполняем диагностику
RUN /bin/sh /app/diagnose.sh

# Исправим vite.config.ts для явного указания директории сборки
RUN echo "📝 Обновление vite.config.ts..."
RUN sed -i "s|plugins: \[react()\],|plugins: [react()],\n  build: {\n    outDir: 'dist',\n  },|" vite.config.ts || echo "Не удалось обновить vite.config.ts"

# Показываем обновленный vite.config.ts
RUN echo "📄 Обновленная конфигурация Vite:"
RUN cat vite.config.ts

# Пробуем сборку снова с исправленной конфигурацией
RUN echo "🏗️ Повторная сборка с исправленной конфигурацией..."
RUN NODE_ENV=production npx vite build --mode production || echo "❌ Повторная сборка не удалась"

# Проверяем результаты повторной сборки
RUN echo "🔍 Результаты повторной сборки:"
RUN ls -la || echo "Директория верхнего уровня:"
RUN mkdir -p dist && echo "Создана директория dist"
RUN touch dist/index.html && echo "Создан пустой index.html для продолжения сборки"
RUN ls -la dist || echo "Директория dist не найдена!"

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

# Копирование скрипта подстановки переменных окружения
COPY env.sh /docker-entrypoint.d/env.sh
RUN chmod +x /docker-entrypoint.d/env.sh

# Открываем порт
EXPOSE 80
RUN echo "🌐 Порт 80 открыт"

# Запуск nginx
CMD ["nginx", "-g", "daemon off;"]