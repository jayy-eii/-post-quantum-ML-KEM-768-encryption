# Production Dockerfile for QUANTUM-SAFE Secure Communication System
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Expose server port (default 3000)
ENV PORT=3000
ENV HOST=0.0.0.0
EXPOSE 3000

# Start server
CMD ["node", "server/server.js"]
