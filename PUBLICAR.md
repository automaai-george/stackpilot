# Publicar o StackPilot — seus 3 passos (só cliques)

O código já está commitado e apontando para o seu GitHub. Falta só o que
exige a SUA conta (eu não posso criar contas por você). Em todos os passos,
entre usando o botão **"Continue with GitHub"** — sem criar senha nova.

## Passo 1 — Criar o repositório (30 segundos)

1. Abra: **https://github.com/new**
2. Em *Repository name* digite: `stackpilot`
3. Marque **Private** (importante!)
4. NÃO marque nenhuma outra opção (sem README, sem .gitignore)
5. Clique **Create repository**
6. Me avise: "criei o repositório" — eu envio o código na hora.

## Passo 2 — Criar o banco na Neon (2 minutos)

1. Abra: **https://neon.tech** → **Sign up** → **Continue with GitHub**
2. Crie um projeto: nome `stackpilot` (região: aceite a sugerida)
3. Na tela do projeto, procure **"Connection string"** e copie o texto que
   começa com `postgresql://...` (se houver opção "Pooled connection",
   escolha essa)
4. Cole essa string aqui no chat para mim — eu migro todos os seus dados.

## Passo 3 — Colocar no ar na Vercel (3 minutos)

1. Abra: **https://vercel.com/signup** → **Continue with GitHub**
2. Clique **Add New… → Project** → escolha o repositório **stackpilot** →
   **Import**
3. Antes de clicar em Deploy, abra **Environment Variables** e adicione as
   3 variáveis que eu vou te passar no chat (DATABASE_URL, AUTH_SECRET e
   APP_PASSWORD — é copiar e colar)
4. Clique **Deploy** e aguarde ~2 minutos.

Pronto: seu app estará em `stackpilot.vercel.app`, no ar 24h, com a landing
page recebendo jogadores. Depois dá para plugar um domínio próprio
(ex.: stackpilot.com.br) direto no painel da Vercel.
