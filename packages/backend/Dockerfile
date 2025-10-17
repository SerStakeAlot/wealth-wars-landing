FROM node:20-alpine AS deps
WORKDIR /app
# Copy only backend manifest (lockfile not present in this workspace)
COPY package.json ./
COPY prisma ./prisma
RUN npm install --omit=dev && npx prisma generate

FROM node:20-alpine AS build
WORKDIR /app
# Copy backend sources only
COPY . ./
RUN npm install && npm run build

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
# Copy production node_modules for backend (includes @prisma/client)
COPY --from=deps /app/node_modules ./node_modules
# Copy compiled backend dist
COPY --from=build /app/dist ./dist
# Copy prisma schema for database operations
COPY --from=deps /app/prisma ./prisma
# Copy backend package.json for metadata
COPY package.json ./package.json
EXPOSE 8787
CMD ["node", "dist/index.js"]
