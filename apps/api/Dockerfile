FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY apps/web/package*.json apps/web/
COPY apps/api/package*.json apps/api/

RUN npm install

COPY . .

WORKDIR /usr/src/app
EXPOSE 4000

CMD ["npm", "run", "dev", "--workspace", "api"]
