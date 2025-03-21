#!/bin/sh
# Подстановка переменных окружения в index.html
envsubst '${VITE_API_URL} ${VITE_API_KEY}' < /usr/share/nginx/html/index.html > /tmp/index.html.tmp
mv /tmp/index.html.tmp /usr/share/nginx/html/index.html