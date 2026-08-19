FROM node:alpine3.23
WORKDIR /app
RUN apk add --no-cache make gcc g++ python3
COPY ./package.json .
RUN npm install
COPY . .
CMD ["npm", "start"]