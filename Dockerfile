FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY domain-mapping.yaml ./
COPY ts-api/ ./ts-api/
COPY scripts/ ./scripts/
COPY src/ ./src/

RUN npm run codegen
RUN npm run build

FROM node:22-alpine

WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules/ ./node_modules/
COPY --from=build /app/dist/ ./dist/

ENV NODE_ENV=production

ENTRYPOINT ["node", "dist/index.js"]
