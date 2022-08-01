FROM node:16-alpine
RUN apk add --no-cache g++ make py3-pip
WORKDIR /usr/db
COPY haus.db .
WORKDIR /usr/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD [ "node", "index.js" ]

