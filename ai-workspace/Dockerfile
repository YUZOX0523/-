# VPS等へのデプロイ用（1社1コンテナ運用を想定）
# 使い方:
#   docker build -t ai-workspace .
#   docker run -d -p 3100:3100 --env-file .env -v ai-workspace-data:/app/data ai-workspace
FROM node:22-slim

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 3100
CMD ["node", "src/index.js"]
