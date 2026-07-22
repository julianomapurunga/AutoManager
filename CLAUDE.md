# AutoManager (VEHIRO) — Instruções do projeto

Regras que o agente deve seguir ao trabalhar neste repositório.

## Organização de arquivos

- **Arquivos SQL** — todo arquivo `.sql` novo deve ser criado **diretamente dentro da pasta `sql/`** na raiz do projeto. Nunca crie `.sql` solto na raiz, em `docs/`, ou em outros diretórios; sempre em `sql/`. Se precisar mover um `.sql` que esteja fora, mova para `sql/`.
- **Documentação** (`.md`) fica em `docs/`.
- **`output/`** contém material gerado por outras ferramentas (kits de marca, imagens) e **não faz parte do projeto** — está no `.gitignore` e não deve ser commitado nem referenciado pelo código.
