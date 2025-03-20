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

# Definir variáveis de ambiente
ENV VITE_SUPABASE_URL=https://hvokwanpdpfmyvcfeccf.supabase.co
ENV VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2b2t3YW5wZHBmbXl2Y2ZlY2NmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkxOTc3MTEsImV4cCI6MjA1NDc3MzcxMX0.CiLSKByYP_llTkvRAxCpjKwyHm0DVS2mBVUwzKnmyzo
ENV VITE_EMAILJS_SERVICE_ID=service_yollei8
ENV VITE_EMAILJS_TEMPLATE_ID=template_0645y6j
ENV VITE_EMAILJS_PUBLIC_KEY=9ikgTf9xVOLPJgGTN
ENV VITE_GEMINI_API_KEY=AIzaSyCb02UOLsV2yiZNq9FK-zZcIdp9KCn91AA

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