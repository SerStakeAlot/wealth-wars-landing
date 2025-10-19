FROM node:20-alpine

WORKDIR /app

# Copy package files from packages/backend
COPY packages/backend/package.json ./

# Copy prisma schema
COPY packages/backend/prisma/ ./prisma/

# Install dependencies
RUN npm install --production

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy pre-built dist files with all subdirectories
COPY packages/backend/dist/ ./dist/

# Start the application
CMD ["node", "dist/index.js"]
