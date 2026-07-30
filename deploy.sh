#!/usr/bin/env bash
# Deploy do VEHIRO no servidor: atualiza o código e recria o container.
# Uso: ./deploy.sh   (rode na pasta do projeto, no servidor, com o .env presente)
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "ERRO: .env não encontrado. Crie-o a partir do .env.example antes de subir." >&2
  exit 1
fi

echo "→ Atualizando código (git pull)..."
git pull --ff-only

echo "→ Construindo e subindo o container..."
docker compose up -d --build

echo "→ Status:"
docker compose ps

echo "→ Logs recentes:"
docker compose logs --tail=20 app
