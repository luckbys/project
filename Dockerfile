# Estágio de build
FROM node:22-alpine AS builder

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@8.15.4 --activate

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de configuração
COPY package.json ./
COPY pnpm-lock.yaml ./

# Instalar dependências
RUN pnpm install --force

# Copiar código fonte
COPY . .

# Build da aplicação
RUN pnpm build

# Estágio de produção
FROM nginx:alpine

# Copiar arquivos de build para o nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuração do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor porta 80
EXPOSE 80

# Iniciar nginx
CMD ["nginx", "-g", "daemon off;"] 