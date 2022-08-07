FROM node:18
RUN apt update && apt install tzdata -y
ENV TZ="Europe/London"
WORKDIR /usr/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD [ "npm", "start" ]

