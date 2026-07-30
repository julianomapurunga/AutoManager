# syntax=docker/dockerfile:1

# ─── Estágio de build ────────────────────────────────────────────────────────
FROM node:22-slim AS build
WORKDIR /app

# Instala TODAS as dependências (dev incluídas — necessárias para o build)
COPY package.json package-lock.json ./
RUN npm ci

# Variáveis do Vite são embutidas no bundle do cliente em TEMPO DE BUILD.
# São públicas por design (URL do projeto + anon key); os segredos de servidor
# NÃO entram aqui — chegam em runtime via ambiente do container.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

COPY . .
RUN npm run build

# Remove as devDependencies — o runtime só precisa das de produção
RUN npm prune --omit=dev

# ─── Estágio de runtime ──────────────────────────────────────────────────────
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Copia o build e as dependências de produção
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

# Diretório de uploads (montado como volume em produção para persistir)
RUN mkdir -p uploads && chown -R node:node /app
# Roda como usuário sem privilégios
USER node

EXPOSE 5000

# Liveness: usa o endpoint /healthz da própria aplicação
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.cjs"]
