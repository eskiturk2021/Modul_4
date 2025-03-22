#!/bin/sh
# Проверяем наличие директории и index.html
if [ ! -d "/usr/share/nginx/html" ]; then
  echo "Создание директории /usr/share/nginx/html"
  mkdir -p /usr/share/nginx/html
fi

if [ ! -f "/usr/share/nginx/html/index.html" ]; then
  echo "Создание пустого index.html"
  echo "<!DOCTYPE html><html><head><title>Loading...</title></head><body><div id='root'></div></body></html>" > /usr/share/nginx/html/index.html
fi

# Создаем файл с конфигурацией переменных окружения в формате JSON
echo "{" > /usr/share/nginx/html/config.json
echo "  \"VITE_API_URL\": \"${VITE_API_URL:-'https://modul3-production.up.railway.app'}\"," >> /usr/share/nginx/html/config.json
echo "  \"VITE_API_KEY\": \"${VITE_API_KEY:-'BD7FpLQr9X54zHtN6K8ESvcA3m2YgJxW'}\"," >> /usr/share/nginx/html/config.json
echo "  \"VITE_WEBSOCKET_URL\": \"${VITE_WEBSOCKET_URL:-'https://modul3-production.up.railway.app'}\"" >> /usr/share/nginx/html/config.json
echo "}" >> /usr/share/nginx/html/config.json

# Безопасно добавляем скрипт загрузки конфигурации перед закрывающим тегом head
CONFIG_LOADER="<script>
  window.APP_CONFIG = {
    VITE_API_URL: '${VITE_API_URL:-\"https://modul3-production.up.railway.app\"}',
    VITE_API_KEY: '${VITE_API_KEY:-\"BD7FpLQr9X54zHtN6K8ESvcA3m2YgJxW\"}',
    VITE_WEBSOCKET_URL: '${VITE_WEBSOCKET_URL:-\"https://modul3-production.up.railway.app\"}'
  };
</script>"

# Безопасная замена с использованием временного файла
TMP_FILE=$(mktemp)
sed "s|</head>|$CONFIG_LOADER</head>|" /usr/share/nginx/html/index.html > "$TMP_FILE"
mv "$TMP_FILE" /usr/share/nginx/html/index.html

echo "Переменные окружения успешно добавлены в index.html"
echo "Содержимое config.json:"
cat /usr/share/nginx/html/config.json