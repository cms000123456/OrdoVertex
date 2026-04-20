FROM node:20-alpine

RUN apk add --no-cache openssl python3 py3-pip samba-client krb5

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

EXPOSE 3001

CMD ["npm", "run", "dev"]
