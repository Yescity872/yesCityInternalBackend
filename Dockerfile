FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN apk add --no-cache python3 make g++ && npm ci --production
COPY . .
ENV NODE_ENV=production
EXPOSE 4001
CMD ["node", "src/socket-server.js"]
