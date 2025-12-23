FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY apps/web/package*.json apps/web/
COPY apps/api/package*.json apps/api/

RUN npm install

COPY . .

WORKDIR /usr/src/app
EXPOSE 3000

CMD ["npm", "run", "dev", "--workspace", "web", "--", "--hostname", "0.0.0.0"]
