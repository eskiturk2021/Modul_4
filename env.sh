#!/bin/sh
# Создаем файл с конфигурацией переменных окружения в формате JSON
echo "{" > /usr/share/nginx/html/config.json
echo "  \"VITE_API_URL\": \"${VITE_API_URL}\"," >> /usr/share/nginx/html/config.json
echo "  \"VITE_API_KEY\": \"${VITE_API_KEY}\"," >> /usr/share/nginx/html/config.json
echo "  \"VITE_WEBSOCKET_URL\": \"${VITE_WEBSOCKET_URL}\"" >> /usr/share/nginx/html/config.json
echo "}" >> /usr/share/nginx/html/config.json

# Вместо прямой подстановки в HTML, добавляем скрипт-загрузчик
CONFIG_LOADER="<script>
  fetch('/config.json')
    .then(response => response.json())
    .then(config => {
      window.APP_CONFIG = config;
    })
    .catch(error => {
      console.error('Ошибка загрузки конфигурации:', error);
    });
</script>"

# Находим закрывающий тег head и добавляем перед ним наш загрузчик конфигурации
sed -i "s|</head>|$CONFIG_LOADER</head>|" /usr/share/nginx/html/index.html