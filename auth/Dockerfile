FROM node:alpine3.23
WORKDIR /app
RUN apk add --no-cache make gcc g++ python3
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
CMD ["npm", "start"]