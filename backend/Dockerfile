FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json ./

RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

EXPOSE 8080
EXPOSE 3000/udp

CMD ["npm", "run", "start"]
