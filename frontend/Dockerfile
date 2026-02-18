# ---------- Build Stage ----------
FROM node:24-alpine AS builder
WORKDIR /app
# Copy only package files first (better caching)
COPY package*.json ./
# Clean install (uses package-lock.json)
RUN npm ci
# Copy rest of source
COPY . .
# Build production assets
RUN npm run build
# ---------- Production Stage ----------
FROM nginx:alpine
# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html
# Copy nginx config 
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]



