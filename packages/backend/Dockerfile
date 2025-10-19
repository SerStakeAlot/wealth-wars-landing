FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json ./

# Copy prisma schema
COPY prisma/ ./prisma/

# Install dependencies
RUN npm install --production

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy pre-built dist files
COPY dist/ ./dist/

# Copy scripts if needed
COPY scripts/ ./scripts/

# Expose port
EXPOSE 8787

# Start the application
CMD ["node", "dist/index.js"]
