# Segurança e backups do StackPilot

## Backups automáticos

Todo dia, às 6h (horário de Brasília ~3h), o sistema salva sozinho uma cópia
de **todos os dados** num cofre privado na Vercel (o "Blob Store"). Guarda os
últimos 14 dias. Ninguém acessa esses arquivos por link solto — precisa estar
logado na sua conta Vercel.

### Como ver / baixar um backup

1. Entre em **vercel.com** (sua conta) → projeto **stackpilot**
2. Menu **Storage** → **stackpilot-blob**
3. Na pasta `backups/` estão os arquivos `stackpilot-AAAA-MM-DD…json`
4. Clique num deles para baixar. É um arquivo de texto com tudo.

> As senhas dos usuários **não** vão no backup (por segurança). Se precisar
> restaurar, os dados voltam e cada pessoa usa "esqueci a senha" (você reseta
> pelo painel do admin).

### Se um dia precisar restaurar

Isso é comigo (parte técnica). Você me manda o arquivo de backup e eu
recoloco os dados no banco. Guarde a calma: como há backup diário, o máximo
que se perderia é o que foi lançado depois do último backup daquele dia.

## Senha travada (você ou um amigo)

- **Trocar a própria senha**: logado, vá em **Configurações → Trocar senha**.
- **Amigo esqueceu a senha**: você entra em **Configurações → Painel do
  administrador**, acha a pessoa e clica **Resetar senha**. O sistema gera uma
  senha temporária — você passa para ela, e ela troca depois.

## Recado honesto para os amigos (beta)

Peça para eles, de vez em quando, entrarem em **Configurações → Backup →
Exportar tudo** e guardarem o Excel. É a cópia pessoal deles. Enquanto o app
for beta, é bom não depender só dele como registro único.
