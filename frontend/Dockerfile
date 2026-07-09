FROM node:20-alpine

WORKDIR /app

COPY package.json ./

RUN npm install

COPY tsconfig.json tsconfig.app.json vite.config.ts tailwind.config.ts postcss.config.cjs index.html ./
COPY src ./src

RUN npm run build

EXPOSE 4173

CMD ["npm", "run", "preview"]
