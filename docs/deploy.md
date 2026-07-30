# Deploy do VEHIRO (Docker)

Como colocar o VEHIRO no ar em um servidor Linux usando Docker.

## Arquitetura da imagem

- **Multi-stage** (`Dockerfile`): um estágio compila (cliente + servidor) e o
  estágio final roda só o build + as dependências de produção.
- Roda como usuário **não-root** (`node`), com `NODE_ENV=production`.
- **Healthcheck** interno bate em `/healthz`.

## Separação de variáveis (importante)

| Tipo | Quais | Quando entram |
|---|---|---|
| **Build-time** (públicas) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Embutidas no bundle do cliente durante `docker build` (via build args, lidas do `.env`) |
| **Runtime** (segredos) | `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, chaves do Asaas, SMTP, `SUPER_ADMIN_EMAIL` | Injetadas no container em execução via `env_file: .env` — **nunca** entram na imagem |

O `.dockerignore` garante que o `.env` **nunca** é copiado para a imagem.

## Pré-requisitos no servidor

- Docker + Docker Compose.
- O repositório clonado.
- Um arquivo **`.env`** na raiz do projeto (copie do `.env.example` e preencha
  com os valores de **produção**). Proteja-o: `chmod 600 .env`.

## Subir / atualizar

```bash
./deploy.sh
```

O script faz `git pull`, reconstrói a imagem e recria o container. Manualmente:

```bash
docker compose up -d --build
docker compose logs -f app
```

O container escuta na porta **5000**, mapeada só na **loopback do host**
(`127.0.0.1:5000`) — ou seja, **não** acessível pela internet. O acesso externo
passa obrigatoriamente pelo reverse proxy com TLS (ver seção abaixo). Para testar
localmente na VPS: `curl http://localhost:5000/healthz`.

## ⚠️ Reverse proxy + HTTPS (obrigatório em produção)

A aplicação usa `trust proxy` e envia **HSTS/CSP**, que exigem **HTTPS**. Além
disso, o rate limit é por IP — expor o Node diretamente permitiria falsificar o
IP via `X-Forwarded-For`. Portanto, **coloque um reverse proxy com TLS na frente**
(nginx, Traefik ou Caddy), encaminhando para `http://app:5000`.

O Caddy é o mais simples (HTTPS automático via Let's Encrypt). Peça para adicionar
um serviço Caddy ao `docker-compose.yml` quando o domínio estiver definido.

## Persistência

- **Uploads**: volume `vehiro_uploads` montado em `/app/uploads` (persistem entre
  reinícios). Para backup, faça snapshot desse volume.
- **Banco de dados**: fica no Supabase (externo), não no container.

## Checklist de produção

- [ ] `.env` de produção no servidor (chaves Asaas de produção, `NODE_ENV` não
      precisa — o container já define).
- [ ] Reverse proxy com TLS na frente da porta 5000.
- [ ] Webhook do Asaas apontando para `https://SEU-DOMINIO/api/billing/webhook`.
- [ ] Google OAuth configurado nos painéis (ver `docs/google-oauth-setup.md`).
- [ ] RLS habilitado no banco (ver `sql/enable-rls.sql`).

## Troubleshooting

### `ASAAS_API_KEY` chega vazia no container / aviso "aact_... is not defined"

A partir do Docker Compose v2.24, o `env_file` faz interpolação de variáveis. Como
a chave do Asaas começa com `$` (`$aact_...`), o compose a interpreta como uma
variável inexistente e o valor chega vazio.

**Correção:** no `.env` do servidor, escape o `$` como `$$`:
```
ASAAS_API_KEY=$$aact_...
```
Recrie o container (`docker compose up -d`) e confira com
`docker compose exec app printenv ASAAS_API_KEY` (deve mostrar um `$` só).

Isso vale só para o `.env` usado pelo docker-compose. No `.env` local (dotenv, via
`npm run dev`), use o valor literal com um `$` só.
