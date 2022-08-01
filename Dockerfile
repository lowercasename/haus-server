FROM node:16-alpine
WORKDIR /usr/db
COPY haus.db .
WORKDIR /usr/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD [ "node", "index.js" ]

