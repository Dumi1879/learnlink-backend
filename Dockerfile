FROM node:18-slim

WORKDIR /app

# Install build dependencies for sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --build-from-source

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
