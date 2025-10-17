FROM node:20-alpine AS deps
WORKDIR /app
# Copy package files
COPY package.json ./
COPY prisma ./prisma
# Install dependencies (npm will use the lockfile from workspace if available)
RUN npm install --omit=dev
# Generate Prisma client (skip if DATABASE_URL not available)
RUN npx prisma generate --schema=./prisma/schema.prisma || echo "Prisma generate skipped - DATABASE_URL not available during build"

FROM node:20-alpine AS build
WORKDIR /app
# Copy all backend files
COPY . ./
# Install all dependencies for building
RUN npm install
RUN npm run build

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
# Copy production node_modules
COPY --from=deps /app/node_modules ./node_modules
# Copy compiled backend dist
COPY --from=build /app/dist ./dist
# Copy prisma schema
COPY --from=deps /app/prisma ./prisma
# Copy package.json
COPY package.json ./
EXPOSE 8787
CMD ["node", "dist/index.js"]
