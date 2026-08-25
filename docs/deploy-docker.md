# Publicacao do backend com Docker

Este guia sobe somente a API Triade FIT e seu PostgreSQL. Ele nao usa PM2 e nao altera os processos dos bots existentes no servidor.

## Antes de subir

1. Instale Docker Engine e Docker Compose Plugin no servidor.
2. Aponte `api.triade-fit.com` para o IP do servidor.
3. No servidor, copie `.env.production.example` para `.env.production` e preencha todos os segredos reais.
4. Troque as senhas e os segredos de desenvolvimento que ja foram usados localmente. Nunca reaproveite o arquivo `backend/.env` no servidor.

`POSTGRES_PASSWORD` aparece tambem dentro da `DATABASE_URL`. Para evitar erro de URL, use uma senha longa formada somente por letras e numeros ou aplique URL encoding aos caracteres especiais.

## Clone enxuto no servidor (opcional)

O mobile e o admin nao sao necessarios para a API Docker. Para baixar somente `backend`, `deploy` e os arquivos da raiz do repositorio, use sparse checkout:

```bash
git clone --filter=blob:none --no-checkout git@github.com:SEU_USUARIO/triade-fit.git triade-fit
cd triade-fit
git sparse-checkout init --cone
git sparse-checkout set backend deploy
git checkout main
```

O modo cone sempre traz os arquivos da raiz, incluindo `package.json`, `package-lock.json`, `docker-compose.production.yml` e `.env.production.example`. O Dockerfile e o `.dockerignore` foram preparados para nao depender de `mobile` nem `admin` no servidor.

## Subida

Na raiz do projeto, no servidor:

```bash
cp .env.production.example .env.production
nano .env.production
docker compose -f docker-compose.production.yml up -d --build
docker compose -f docker-compose.production.yml ps
curl http://127.0.0.1:3333/api/health
```

O container aplica `prisma migrate deploy` automaticamente antes de iniciar a API. Ele **nao** executa `seed`, pois o seed atual remove todos os registros e so pode ser usado em uma base vazia de demonstracao.

Na primeira subida de uma base vazia, crie o administrador definido em `ADMIN_EMAIL` e `ADMIN_PASSWORD`:

```bash
docker compose -f docker-compose.production.yml exec api npm --workspace backend run admin:create
```

Esse comando cria o administrador ou promove um usuario existente sem remover nem resetar dados. Execute-o somente depois de definir uma senha forte em `.env.production`.

Se a porta `3333` ja estiver ocupada por outro projeto no host, altere somente `TRIADE_API_PORT` para `3340` (ou outra livre) em `.env.production` e mude o `proxy_pass` do Nginx para a mesma porta. A porta interna do backend permanece `3333` e a URL publica continua sem porta: `https://api.triade-fit.com`.

## HTTPS

Copie `deploy/nginx/triade-fit.conf.example` para a configuracao do Nginx, confira a porta configurada em `proxy_pass`, valide e recarregue:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d api.triade-fit.com
```

Depois, confirme:

```bash
curl https://api.triade-fit.com/api/health
```

Use essa mesma base em `PUBLIC_BASE_URL`, no webhook do Asaas e no `EXPO_PUBLIC_API_URL` do build Android, acrescentando `/api` apenas na variavel do Expo.

## Dados e uploads atuais

Os volumes `triade_fit_postgres` e `triade_fit_uploads` preservam dados entre reinicios e recriacoes normais dos containers. Nao rode `docker compose down -v` em producao.

O volume de uploads inicia vazio de proposito: fotos e arquivos locais nao sao enviados para a imagem Docker. Se for migrar os dados que ja existem no computador, faca backup do banco e da pasta `backend/uploads` antes. Depois de copiar a pasta para o servidor, com a API em execucao:

```bash
docker cp ./backend/uploads/. triade-fit-api:/app/backend/uploads/
```

Para uma base nova, use `admin:create`; nao execute o seed em uma base que ja tenha dados.

## Operacao

```bash
docker compose -f docker-compose.production.yml logs -f api
docker compose -f docker-compose.production.yml restart api
docker compose -f docker-compose.production.yml up -d --build
```

O PostgreSQL nao e exposto na internet. Para acessar pontualmente o banco, use `docker compose -f docker-compose.production.yml exec postgres psql -U triade -d triade_fit` dentro do servidor.
