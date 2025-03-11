# Этап сборки
FROM node:18-alpine AS build

WORKDIR /app

# Копирование файла зависимостей
COPY package.json ./

# Установка зависимостей
RUN npm install --legacy-peer-deps

# Копирование исходного кода
COPY . .

# Сборка приложения
RUN npm run build || (cat /app/tsconfig.json && ls -la && exit 1)

# Этап production
FROM nginx:alpine AS production

# Копирование собранных файлов из этапа сборки
COPY --from=build /app/dist /usr/share/nginx/html

# Создание конфигурации nginx
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Открываем порт
EXPOSE 80

# Запуск nginx
CMD ["nginx", "-g", "daemon off;"]