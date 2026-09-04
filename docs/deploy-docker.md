# Publicacao do backend com Docker

Este guia sobe a API Triade FIT, o PostgreSQL e o painel administrativo React. Ele nao usa PM2 e nao altera os processos dos bots existentes no servidor.

## Antes de subir

A chave atual do Asaas deve ser revogada se já apareceu em arquivo versionável, captura de tela ou conversa. Ao cadastrar a nova chave em `.env.production`, use aspas simples, por exemplo `ASAAS_API_KEY='$aact_hmlg_...'`. O caractere `$` faz parte da chave; sem aspas simples o Docker Compose pode interpolá-lo e enviar um valor inválido ao container.

1. Instale Docker Engine e Docker Compose Plugin no servidor.
2. Aponte `triade-api.testes-techcode.shop` e `admin-triade-fit.testes-techcode.shop` para o IP do servidor.
3. No servidor, copie `.env.production.example` para `.env.production` e preencha todos os segredos reais.
4. Troque as senhas e os segredos de desenvolvimento que ja foram usados localmente. Nunca reaproveite o arquivo `backend/.env` no servidor.

`POSTGRES_PASSWORD` aparece tambem dentro da `DATABASE_URL`. Para evitar erro de URL, use uma senha longa formada somente por letras e numeros ou aplique URL encoding aos caracteres especiais.

`OPENAI_API_KEY` deve existir apenas em `.env.production` e é usada pela API para a Luna. Se uma chave aparecer em captura, conversa ou commit, revogue-a no provedor e gere outra. O APK e o painel nunca recebem essa chave.

## Clone enxuto no servidor (opcional)

O mobile nao e necessario na VPS, mas o admin React sera servido nela. Para baixar somente `backend`, `admin`, `deploy` e os arquivos da raiz do repositorio, use sparse checkout:

```bash
git clone --filter=blob:none --no-checkout https://github.com/gutemberg348/triade-fit.git triade-fit
cd triade-fit
git sparse-checkout init --cone
git sparse-checkout set backend admin deploy
git checkout main
```

O modo cone sempre traz os arquivos da raiz, incluindo `package.json`, `package-lock.json`, `docker-compose.production.yml` e `.env.production.example`. Os Dockerfiles foram preparados para nao depender de `mobile` no servidor.

## Subida

Na raiz do projeto, no servidor:

```bash
cp .env.production.example .env.production
nano .env.production
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
docker compose --env-file .env.production -f docker-compose.production.yml ps
curl http://127.0.0.1:3335/api/health
```

O container aplica `prisma migrate deploy` automaticamente antes de iniciar a API. Ele **nao** executa `seed`, pois o seed atual remove todos os registros e so pode ser usado em uma base vazia de demonstracao.

A imagem da API instala `ffmpeg`. A Luna não envia o MP4 bruto ao modelo: a API extrai até oito quadros distribuídos pelo vídeo para analisar início, meio e fim do exercício. Portanto, não remova a instalação de `ffmpeg` do `backend/Dockerfile`.

O container `triade-fit-admin` gera o React/Vite em modo producao e o entrega como site estatico. `VITE_API_URL` e incorporada no build; se essa URL mudar, execute `docker compose --env-file .env.production -f docker-compose.production.yml up -d --build admin` novamente. O `--env-file .env.production` tambem e obrigatorio em todos os comandos Compose: `env_file` injeta variaveis no container, mas nao basta para interpolar `${...}` no proprio arquivo Compose.

Na primeira subida de uma base vazia, crie o administrador definido em `ADMIN_EMAIL` e `ADMIN_PASSWORD`:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec api npm --workspace backend run admin:create
```

Esse comando cria o administrador ou promove um usuario existente sem remover nem resetar dados. Execute-o somente depois de definir uma senha forte em `.env.production`.

Se a porta escolhida no host estiver ocupada por outro projeto, altere somente `TRIADE_API_PORT` (por exemplo, de `3335` para `3340`) em `.env.production` e mude o `proxy_pass` do Nginx para a mesma porta. A porta interna do backend permanece `3333` e a URL pública continua sem porta: `https://triade-api.testes-techcode.shop`.

## HTTPS

Copie `deploy/nginx/triade-fit.conf.example` para a API e `deploy/nginx/triade-fit-admin.conf.example` para o painel. Confira as portas configuradas em `proxy_pass`, valide e recarregue:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d triade-api.testes-techcode.shop
sudo certbot --nginx -d admin-triade-fit.testes-techcode.shop
```

Depois, confirme:

```bash
curl https://triade-api.testes-techcode.shop/api/health
```

Use essa mesma base em `PUBLIC_BASE_URL`, no webhook do Asaas e no `EXPO_PUBLIC_API_URL` do build Android, acrescentando `/api` apenas na variável do Expo. O valor atual é `https://triade-api.testes-techcode.shop/api`.

## Dados e uploads atuais

Os volumes `triade_fit_postgres` e `triade_fit_uploads` preservam dados entre reinicios e recriacoes normais dos containers. Nao rode `docker compose down -v` em producao.

O volume de uploads inicia vazio de proposito: fotos e arquivos locais nao sao enviados para a imagem Docker. Se for migrar os dados que ja existem no computador, faca backup do banco e da pasta `backend/uploads` antes. Depois de copiar a pasta para o servidor, com a API em execucao:

```bash
docker cp ./backend/uploads/. triade-fit-api:/app/backend/uploads/
```

Para uma base nova, use `admin:create`; nao execute o seed em uma base que ja tenha dados.

## Operacao

```bash
docker compose --env-file .env.production -f docker-compose.production.yml logs -f api
docker compose --env-file .env.production -f docker-compose.production.yml restart api
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

Para publicar uma atualização já versionada:

```bash
cd /var/www/alcione/triade-fit
git pull --ff-only origin main
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
docker compose --env-file .env.production -f docker-compose.production.yml ps
curl https://triade-api.testes-techcode.shop/api/health
```

O comando recria API e painel e aplica migrations pendentes automaticamente. Confira os logs com `logs -f api` se algum container não ficar saudável. O sparse checkout continua excluindo `mobile/` dos próximos pulls.

Alterações no backend, banco e painel terminam aqui. Se a atualização também modificou `mobile/`, gere um novo artefato na máquina de desenvolvimento: `eas build --platform android --profile preview` para APK ou `--profile production` para AAB da Play Store. Não é necessário clonar o mobile na VPS.

O PostgreSQL nao e exposto na internet. Para acessar pontualmente o banco, use `docker compose --env-file .env.production -f docker-compose.production.yml exec postgres psql -U triade -d triade_fit` dentro do servidor.
