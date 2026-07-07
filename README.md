# Poker Bankroll

App pessoal de controle de bankroll de poker — substitui a planilha
"Controle Bank 2026.xlsx" com edição estilo planilha e cálculos automáticos.

## Como rodar

Abra o terminal nesta pasta (`poker-app`) e execute:

```bash
npm run dev
```

Depois abra **http://localhost:3000** no navegador. Pronto.

> Na primeira vez em um computador novo: `npm install`, depois
> `npm run db:push` (cria o banco) e `npm run import` (importa a planilha).

## Páginas

- **Iniciar grind** (`/grind`) — o jeito rápido de lançar o dia, sem tabela.
  Abre no dia de hoje (fuso do seu computador; setas para trocar de dia).
  Clique em *Iniciar grind*, preencha a banca inicial de cada site (ou use o
  atalho "última banca") e, no fim do dia, o saldo final e as horas. Cada
  site mostra o status (*em jogo* / *fechado*) e tudo alimenta as mesmas
  tabelas do mês automaticamente.
- **Bankroll** (`/bankroll`) — onde o dinheiro está agora: banca total,
  valor de cada site (vem do último saldo lançado) e as **contas digitais**
  editáveis (saldo do mês atual, com atalho "manter último valor" e criação
  de contas novas ali mesmo).
- **Dashboard** (`/`) — banca total atual (sites + carteiras) e um **filtro de
  período** (ano, de/até mês, ou "Todos os anos") com atalhos *Este mês*,
  *Este ano* e *Tudo*. Lucro, horas, lucro/hora, melhor mês, gráfico de
  evolução e resultado por site respeitam o período escolhido.
- **Mês** (`/mes/2026/7`) — tabela editável igual à planilha: um bloco por
  site com *Banca inicial*, *Saldo final* e *Resultado* (calculado), além de
  *Jogou* e *Horas* por dia. Clique numa célula, digite e saia dela (Tab,
  Enter ou clique fora) — **salva sozinho** e todos os totais recalculam na
  hora. Embaixo: carteiras do mês e gráfico de lucro diário.
- **Anual** (`/anual/2026`) — matriz sites × meses com linha TOTAL, horas
  por mês, lucro por hora e gráfico de evolução (lucro e horas).
- **Estatísticas** (`/estatisticas`) — maior downswing e downswing atual
  (com gráfico "underwater"), resultado por dia da semana e por horário de
  início, comparativo entre sites (lucro/hora estimado + pizza da banca) e
  quebras por tipo de jogo e estado mental (A/B/C).
- **Relatório** (`/relatorio/2026/7`) — fechamento do mês imprimível (botão
  Imprimir/PDF): números, comparações com o mês anterior e com o mesmo mês
  do ano passado, melhor/pior dia, por site e caixa do mês.
- **Configurações** (`/config`) — adicionar, renomear, reordenar,
  ativar/desativar e excluir sites e carteiras. Desativar esconde sem apagar
  o histórico; excluir apaga os dados.

## Recursos de profissional

- **Metas** — defina metas mensais/anuais de horas, dias e lucro clicando
  em "definir" na seção Metas do Dashboard. As barras mostram o *ritmo*
  (onde você deveria estar hoje) e, no mês corrente, duas projeções de
  fechamento: pelo ritmo do próprio mês e pelo seu lucro/hora dos últimos
  12 meses. O grind mostra quantas horas por dia faltam para bater a meta.
- **Sessões com cronômetro** — no grind, "Iniciar sessão" liga o relógio;
  "Encerrar" grava o intervalo. Pode ter várias sessões no dia e as horas
  somam sozinhas (edição manual continua possível).
- **Notas do dia** — tipo de jogo (Cash/MTT/Spins), seu jogo A/B/C e
  anotações; cruzados com o resultado em Estatísticas.
- **Movimentações** — saques, depósitos e despesas na página do mês;
  somados no Dashboard (Caixa) e no Relatório (lucro líquido).
- **Alertas de banca** — em Configurações, defina concentração máxima por
  site e saldo mínimo; avisos aparecem no Dashboard.
- **Moedas** — cada site pode ser USD/EUR/BRL (Configurações), com
  cotações manuais para converter tudo para US$ nos totais.

## Conceitos (iguais aos da planilha)

- **resultado** = saldo final − banca inicial (célula vazia conta como 0)
- **Lucro Total do site no mês** = soma dos resultados
- **Banca do site** = último saldo final registrado
- **Banca total** = soma das bancas dos sites + saldos das carteiras
- **Lucro por hora** = lucro ÷ horas (mostra "—" quando não há horas)

Nada disso fica gravado no banco — é sempre recalculado a partir dos
lançamentos, como as fórmulas da planilha.

## Seus dados

Tudo fica no arquivo **`prisma/dev.db`** (SQLite). Faça backup dele de vez
em quando.

Para (re)importar uma planilha, informe o arquivo e o ano — **só os dados
daquele ano são apagados e reimportados**, o resto fica intacto:

```bash
npm run import -- "..\Controle Bank 2026.xlsx" 2026
npm run import -- "..\Planilha_Bankroll_2024_George.xlsx" 2024 --sites-inativos --map "IPOKER=IPOKER IT"
```

`--map "De=Para"` renomeia um site da planilha ao importar (o "IPOKER" da
planilha de 2024 é o site italiano, importado como "IPOKER IT").

`--sites-inativos` faz sites novos dessa planilha entrarem desativados
(bom para sites antigos, como os da Itália — eles continuam aparecendo nas
páginas de 2024, mas não entram na banca total atual nem nos meses novos).

## Acessar do celular / fora de casa (Tailscale)

O app roda no seu PC e fica acessível **só para os seus aparelhos**, de
qualquer lugar, sem expor nada na internet:

1. Instale o Tailscale no PC (tailscale.com/download) e entre com sua conta
   (Google, por exemplo). Instale também o app do Tailscale no celular e
   entre com a MESMA conta.
2. Deixe o app rodando no PC: dê dois cliques em **"Iniciar Poker.bat"**
   (nesta pasta) — ele sobe a versão otimizada em http://localhost:3000.
3. Uma única vez, num terminal, rode:
   `tailscale serve --bg 3000`
   Isso cria um endereço https tipo `https://seu-pc.seu-tailnet.ts.net`
   que funciona no navegador do celular (o Tailscale mostra o endereço).
4. Pronto: abra esse endereço no celular com o Tailscale ligado. O PC
   precisa estar ligado e com o app rodando.

Para desfazer: `tailscale serve --bg off`.

Alternativa sem o `serve`: rode `npm run start:rede` no PC e acesse
`http://<ip-do-pc-no-tailscale>:3000` no celular (o Windows vai pedir para
liberar o Node no firewall na primeira vez — aceite em rede privada).

## Publicar na internet, de graça (Vercel + Neon)

O app tem **tela de login** (senha em `APP_PASSWORD` no `.env`). Para colocar
no ar 24h numa URL sua:

1. **GitHub** — crie uma conta e um repositório **privado** (ex.:
   `poker-bankroll`). Envie esta pasta para ele (`git push`).
2. **Neon** (neon.tech) — crie uma conta e um projeto Postgres grátis.
   Copie a **connection string** (a versão "pooled").
3. No PC: troque no `prisma/schema.prisma` o `provider = "sqlite"` por
   `"postgresql"`, aponte o `.env` para a URL do Neon e rode:
   `npx prisma db push` e depois `npx tsx scripts/migrar-para-neon.ts`
   (copia todo o seu histórico do arquivo local para o Neon).
4. **Vercel** (vercel.com) — entre com o GitHub, importe o repositório e,
   em *Settings → Environment Variables*, cadastre `DATABASE_URL` (Neon),
   `APP_PASSWORD` (sua senha) e `AUTH_SECRET` (chave longa aleatória).
   Clique em Deploy: sua URL será algo como `poker-bankroll.vercel.app`.

Depois disso a fonte da verdade é o Neon; o arquivo `prisma/dev.db` vira
um backup do passado.

## Comandos úteis

| Comando           | O que faz                                    |
| ----------------- | -------------------------------------------- |
| `npm run dev`     | roda o app em modo desenvolvimento           |
| `npm run build`   | gera a versão otimizada                      |
| `npm start`       | roda a versão otimizada (após o build)       |
| `npm run import`  | (re)importa uma planilha (arquivo + ano)     |
| `npm run db:push` | cria/atualiza a estrutura do banco           |
