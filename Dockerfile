# Node.js LTS production image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency definition
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy project source and seed database
COPY . .

# Set default production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose server port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
