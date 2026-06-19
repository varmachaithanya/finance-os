FROM node:20-alpine AS build
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies fresh without lock file
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["/bin/sh", "-c", "serve -s dist -p ${PORT:-3000}"]