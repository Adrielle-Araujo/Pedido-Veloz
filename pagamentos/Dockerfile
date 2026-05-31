FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /app .
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3002
CMD ["node", "index.js"]