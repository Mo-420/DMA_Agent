FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY server/ ./server/
COPY .env ./
COPY dmaagent-7ac0245a2538.json ./

# Expose port
EXPOSE 3004

# Start the application
CMD ["node", "server/index.js"]
