FROM node:12 as builder

WORKDIR /build

COPY . .

RUN npm install
RUN npm run dist

FROM node:12-alpine

WORKDIR /app

COPY ./package.json .
COPY ./package-lock.json .

RUN npm install --only=prod

COPY --from=builder /build/dist .

CMD [ "node", "main.js" ]
