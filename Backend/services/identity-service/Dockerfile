FROM node:22-bookworm-slim

WORKDIR /app
COPY . .
RUN npm ci --omit=dev

EXPOSE 5101
CMD ["npm", "run", "identity:start"]
