# Single-stage build & run
FROM node:20-alpine

WORKDIR /app

# Install all deps (including dev) to allow build
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/index.js"]
