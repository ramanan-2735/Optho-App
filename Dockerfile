# Use Puppeteer-enabled base image
FROM ghcr.io/puppeteer/puppeteer:latest

# Run everything as root to avoid permission issues
USER root

# Set working directory
WORKDIR /app

# Copy and install dependencies
COPY package*.json ./
RUN npm install

# Copy rest of the project
COPY . .

# Expose your server port
EXPOSE 3000

# Run your main script
CMD ["node", "index.js"]

