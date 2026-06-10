# ---- build stage (same base as the API, already cached locally) ----
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ---- serve stage: zero-dependency node server (no npm install, no nginx) ----
FROM node:20-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server.cjs ./server.cjs
EXPOSE 8080
CMD ["node", "server.cjs"]
