# Login com Google — Configuração do Google Cloud Console

Guia passo a passo para habilitar o "Entrar com Google" do VEHIRO. O código já
está pronto; falta apenas criar as credenciais no Google e colá-las no Supabase.

**Tempo estimado:** 15–20 min.

**Valores do seu projeto (já preenchidos ao longo do guia):**

| O quê | Valor |
|---|---|
| Supabase project ref | `zbqgovgbrcvrsfbnzxdv` |
| **Redirect URI** (Authorized redirect URI no Google) | `https://zbqgovgbrcvrsfbnzxdv.supabase.co/auth/v1/callback` |
| Origem em desenvolvimento | `http://localhost:5001` |
| Origem em produção | *(a URL final do sistema, ex.: `https://app.vehiro.com.br`)* |

> ⚠️ O **Redirect URI** aponta para o Supabase, **não** para o VEHIRO. Quem
> recebe o retorno do Google é o Supabase, que depois manda o usuário de volta
> para o app. Isso costuma confundir — copie exatamente o valor da tabela acima.

---

## Parte 1 — Google Cloud Console

### 1. Criar (ou escolher) um projeto

1. Acesse <https://console.cloud.google.com/>.
2. No topo, clique no seletor de projetos → **Novo projeto**.
3. Nome: `VEHIRO` (ou o que preferir). Deixe "Organização" como está.
4. **Criar** e aguarde. Depois, selecione esse projeto no seletor do topo.

### 2. Configurar a Tela de consentimento OAuth

Antes de criar a credencial, o Google exige definir o que o usuário vê ao
autorizar.

1. Menu (☰) → **APIs e serviços** → **Tela de permissão OAuth**
   (*OAuth consent screen*).
2. **User Type:** escolha **Externo** (*External*) e clique em **Criar**.
   - "Externo" é o correto para um SaaS onde qualquer lojista se cadastra.
     "Interno" só existe se você tiver Google Workspace e quiser restringir à
     sua organização.
3. **Informações do app:**
   - **Nome do app:** `VEHIRO` — é o nome que aparece na tela "Fazer login com o
     Google para continuar em **VEHIRO**".
   - **E-mail de suporte do usuário:** seu e-mail.
   - **Logo (opcional):** pode pular por enquanto (enviar logo aciona verificação).
4. **Domínios do app (opcional em teste):** pode deixar em branco durante os
   testes. Em produção, preencha o domínio do sistema.
5. **Dados de contato do desenvolvedor:** seu e-mail. **Salvar e continuar**.
6. **Escopos (*Scopes*):** clique em **Adicionar ou remover escopos** e marque
   apenas os três básicos (são *não sensíveis*, não exigem verificação do Google):
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`

   **Atualizar** → **Salvar e continuar**.
7. **Usuários de teste:** enquanto o app estiver em modo **Testing**, só e-mails
   adicionados aqui conseguem logar. Clique em **Adicionar usuários** e inclua os
   e-mails que vão testar (o seu, no mínimo). **Salvar e continuar**.
8. Revise o resumo e **Voltar ao painel**.

### 3. Criar a credencial OAuth (Client ID)

1. Menu → **APIs e serviços** → **Credenciais** (*Credentials*).
2. **+ Criar credenciais** → **ID do cliente OAuth**.
3. **Tipo de aplicativo:** **Aplicativo da Web** (*Web application*).
4. **Nome:** `VEHIRO Web` (uso interno, não aparece ao usuário).
5. **Origens JavaScript autorizadas** (*Authorized JavaScript origins*) —
   clique em **+ Adicionar URI** para cada uma:
   - `http://localhost:5001`
   - a URL de produção, quando tiver (ex.: `https://app.vehiro.com.br`)
6. **URIs de redirecionamento autorizados** (*Authorized redirect URIs*) —
   **este é o passo crítico.** Adicione **exatamente**:
   ```
   https://zbqgovgbrcvrsfbnzxdv.supabase.co/auth/v1/callback
   ```
   - É um só, e é sempre o do Supabase (o mesmo para dev e produção).
   - Sem barra no final, sem espaços. Um caractere errado quebra o login com
     erro `redirect_uri_mismatch`.
7. **Criar.** Aparece um popup com **Seu ID do cliente** e **Sua chave secreta
   do cliente** — deixe aberto (ou copie os dois) para a Parte 2.

> 🔒 O **Client Secret** é uma senha. Não faça commit dele, não cole em issue,
> chat ou código. Ele vive apenas no painel do Supabase.

---

## Parte 2 — Supabase

1. Acesse <https://supabase.com/dashboard/project/zbqgovgbrcvrsfbnzxdv>.
2. **Authentication** → **Sign In / Providers** (ou **Providers**) → **Google**.
3. Ative o **Enable Sign in with Google**.
4. Cole:
   - **Client ID (for OAuth):** o ID do cliente da Parte 1.
   - **Client Secret (for OAuth):** a chave secreta da Parte 1.
5. **Save**.

### Liberar as URLs de redirecionamento do app

1. Ainda no Supabase: **Authentication** → **URL Configuration**.
2. **Site URL:** a URL principal do app.
   - Dev: `http://localhost:5001`
   - Produção: troque pela URL real quando publicar.
3. **Redirect URLs** → **Add URL**, incluindo o caminho `/login` que o app usa
   ao voltar do Google:
   - `http://localhost:5001/login`
   - `https://SEU-DOMINIO/login` (produção)
4. **Save**.

> Por que `/login`? No código, o `signInWithOAuth` usa
> `redirectTo: ${window.location.origin}/login`. É para onde o Supabase manda o
> usuário depois de autenticar. Se essa URL não estiver na lista, o Supabase
> recusa o retorno.

---

## Parte 3 — Testar

1. Garanta que o servidor está rodando (`npm run dev`) na porta 5001.
2. Abra `http://localhost:5001/login` e clique em **Entrar com Google**.
3. Faça login com um e-mail que esteja na lista de **usuários de teste**
   (Parte 1, passo 7).
4. Fluxo esperado:
   - Google autentica → volta ao app → como ainda não há loja, abre a tela
     **"Concluir cadastro"** com seu nome já preenchido.
   - Preencha loja, CPF, telefone e sexo → **Concluir cadastro** → cai no sistema.
5. Da segunda vez em diante, o mesmo e-mail entra direto no Dashboard, sem passar
   pela tela de concluir cadastro.

---

## Colocar em produção (quando for a hora)

- **Publicar o app:** na Tela de consentimento OAuth, o app começa em **Testing**
  (só usuários de teste, e aparece um aviso "app não verificado"). Para liberar a
  qualquer pessoa, clique em **PUBLICAR APP** (*Publish app*) e confirme.
- **Verificação do Google:** como você usa apenas os escopos não sensíveis
  (`email`, `profile`, `openid`), **não** é preciso passar pelo processo de
  verificação. O app publicado funciona para qualquer conta Google. (A
  verificação só é exigida se você adicionar escopos sensíveis ou logo/branding
  que o Google queira revisar.)
- **Atualizar as URLs:** adicione o domínio de produção nas Origens JavaScript
  (Google) e nos Redirect URLs / Site URL (Supabase).

---

## Erros comuns

| Sintoma | Causa provável | Correção |
|---|---|---|
| `redirect_uri_mismatch` | O Redirect URI do Google não bate | Confirme `https://zbqgovgbrcvrsfbnzxdv.supabase.co/auth/v1/callback`, sem barra final |
| `403: access_denied` / "app não concluiu verificação" | E-mail não está na lista de usuários de teste | Adicione o e-mail em Usuários de teste, ou publique o app |
| Volta ao login e não entra | Redirect URL não liberada no Supabase | Adicione `http://localhost:5001/login` em URL Configuration |
| "Unsupported provider" ao clicar | Provider Google não ativado no Supabase | Ative e salve em Providers → Google |
| Loga mas cai numa tela em branco | Servidor sem as variáveis do Supabase | Verifique `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env` |
