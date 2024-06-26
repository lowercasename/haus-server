FROM node:20
RUN apt update && apt install tzdata -y
ENV TZ="Europe/London"
WORKDIR /usr/app
COPY package*.json ./
RUN yarn install
COPY . .
EXPOSE 8080
CMD [ "yarn", "start" ]

