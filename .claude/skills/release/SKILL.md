---
name: release
description: Publica uma nova versão do VEHIRO/AutoManager. Resume as mudanças pendentes no git, atualiza o APP_VERSION e o CHANGELOG em shared/version.ts, e commita tudo na main. Use SEMPRE que o usuário disser /release, "gera versão", "sobe versão", "lança versão", "fecha a versão", "cria o release", "atualiza o projeto e versiona", "bump de versão" ou pedir para commitar as mudanças gerando changelog — mesmo que não use a palavra "release".
---

# Release — versionar e commitar o AutoManager (VEHIRO)

Esta skill fecha um ciclo de trabalho: pega tudo que mudou desde o último commit,
escreve um resumo em português, aplica a nova versão no `shared/version.ts` (que
alimenta o CHANGELOG mostrado na Sidebar, na ChangelogPage e na landing) e commita
na `main`.

A ideia é que **um único resumo** sirva para os dois lugares — o CHANGELOG e a
mensagem de commit — para não ter divergência entre "o que o app mostra" e "o que
o git registra".

## Argumentos aceitos

O usuário pode chamar de várias formas:

- `/release` — infira a versão pelas mudanças.
- `/release 0.5.0` — usa exatamente essa versão.
- `/release minor` (ou `patch` / `major`) — calcula a partir do `APP_VERSION` atual.
- `/release 0.5.0 "Título opcional"` — versão + título fixo.

## Passo a passo

### 1. Verifique se há o que lançar

Rode `git status --short`. Se não houver nada pendente (nem modificados, nem
arquivos novos rastreáveis), **pare** e avise que não há mudanças para versionar.
Não crie uma versão vazia.

### 2. Entenda o que mudou

Leia as mudanças de verdade — não confie só no `git log`:

```bash
git status --short
git diff            # alterações não preparadas
git diff --cached   # alterações preparadas
```

Para arquivos novos (untracked), leia o conteúdo relevante. O objetivo é conseguir
descrever, em linguagem de usuário final, o que essa versão entrega.

Leia também a versão atual (a fonte da verdade é o `APP_VERSION`, **não** o
`package.json`):

```bash
grep 'APP_VERSION' shared/version.ts
```

### 3. Decida a nova versão

- Se o usuário passou uma versão explícita, use-a.
- Se passou `patch`/`minor`/`major`, calcule a partir do `APP_VERSION` atual
  (semver: `major.minor.patch`).
- Se não passou nada, **infira** pela natureza das mudanças e **declare** sua
  escolha e o motivo:
  - Só correções de bug / ajustes internos → **patch** (0.0.x).
  - Novas funcionalidades sem quebrar nada → **minor** (0.x.0).
  - Mudança que quebra compatibilidade → **major** (x.0.0).

Enquanto o projeto está em `0.y.z` (pré-1.0), seja conservador: a maioria dos
ciclos é `minor` ou `patch`.

### 4. Escreva o resumo (isto vira CHANGELOG **e** commit)

Gere bullets concisos, **em português**, voltados ao usuário final, agrupando por
tema quando fizer sentido (funcionalidades, correções, segurança, etc.). Cada
bullet é uma frase clara do que mudou — como as entradas que já existem no
`CHANGELOG` de `shared/version.ts`.

Regras do arquivo de notas que o `npm run release` consome:
- **Uma frase por linha**, **sem** hífen no começo (o script já trata cada linha
  como um item; um `- ` viraria parte do texto).
- Linhas em branco e linhas começando com `#` são ignoradas.

Escreva as notas num arquivo temporário **fora do repo** para não commitá-lo:

```bash
NOTES=$(mktemp)
cat > "$NOTES" <<'EOF'
Primeira mudança descrita de forma clara para o lojista
Segunda mudança
Correção de tal coisa
EOF
```

Defina também um **título** curto da versão (uma linha que resume o conjunto).

### 5. Aplique a versão

```bash
npm run release -- <versao> "<titulo>" "$NOTES"
```

Isso edita **apenas** o `shared/version.ts` (atualiza o `APP_VERSION` e insere a
entrada nova no topo do `CHANGELOG`). Ele **não** commita nem faz push — quem faz
isso é você, no próximo passo. Se quiser conferir antes, rode o mesmo comando com
`--dry-run` primeiro.

Depois, apague o arquivo temporário: `rm -f "$NOTES"`.

### 6. Commite na main

O dono do projeto commita **direto na `main`**, sem criar branch (ver a memória
[[commit-directly-on-main]]). Confirme que está na `main` (`git branch --show-current`).

Prepare e confira o que vai entrar — o `.gitignore` já mantém fora o `.env`, o
`output/`, os `uploads/` e o `.claude/` (exceto as skills), mas dê uma olhada
rápida para garantir que nenhum segredo ou imagem escapou:

```bash
git add -A
git status --short
```

Commite com o **mesmo resumo**: a primeira linha é o título da versão (pode
prefixar com `vX.Y.Z:`), seguida das bullets, terminando com o co-autor:

```
vX.Y.Z: <título>

- <bullet 1>
- <bullet 2>
- ...

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

**Não faça push** a menos que o usuário peça explicitamente.

### 7. Reporte

Informe: a nova versão aplicada, o hash do commit, e lembre que o push é um passo
separado (a `main` local fica à frente da `origin/main` até você fazer o push).

## Observações

- **Não trave o release em `npm run check`/typecheck**: o projeto tem erros de
  tipo pré-existentes no baseline, então um `tsc` "com erros" é o estado normal e
  não indica regressão desta versão.
- Se o usuário estiver no meio de outra tarefa e pedir o release, versione o que
  já está pronto no working tree — não invente mudanças que não existem no diff.
