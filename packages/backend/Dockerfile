FROM node:20-alpine AS deps
WORKDIR /app/packages/backend
# Copy only backend manifest (lockfile not present in this workspace)
COPY packages/backend/package.json ./
RUN npm install --omit=dev

FROM node:20-alpine AS build
WORKDIR /app/packages/backend
# Copy backend sources only
COPY packages/backend ./
RUN npm install && npm run build

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
# Copy production node_modules for backend
COPY --from=deps /app/packages/backend/node_modules ./node_modules
# Copy compiled backend dist
COPY --from=build /app/packages/backend/dist ./dist
# Copy backend package.json for metadata
COPY packages/backend/package.json ./package.json
EXPOSE 8787
CMD ["node", "dist/index.js"]
