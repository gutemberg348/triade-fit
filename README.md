# Triade FIT

Plataforma completa para acompanhamento de alunos, baseada na identidade visual do `index.html` original.

Para entender arquitetura, domínio, rotas, fluxos, decisões e limitações antes de alterar o projeto, leia [`docs/base.md`](docs/base.md). Essa é a memória técnica principal do repositório.

O app reúne conteúdo introdutório e módulos da Home, programas de treino, evolução corporal com medidas e fotos organizadas por módulo liberado, comunidade com curtidas/comentários/respostas e a assistente Luna. A Luna estima nutrientes a partir de fotos de alimentos e orienta adaptações de treino por texto, foto ou vídeo curto; as respostas são auxiliares e não substituem avaliação profissional.

## Estrutura

- `backend/`: API REST Node.js + Express + Prisma + PostgreSQL.
- `admin/`: painel web React + Vite, responsivo para desktop, notebook e tablet.
- `mobile/`: aplicativo Expo/React Native para Android e iOS.
- `design-reference/`: tokens extraídos do protótipo original.
- `index.html`: referência visual original, preservada sem alterações.

## Pré-requisitos

- Node.js 20+
- Docker Desktop
- Para executar em aparelho físico: Expo Go compatível ou development build, com celular/computador na mesma rede
- Em Linux/macOS fora do Docker: `ffmpeg` instalado e disponível no `PATH` para análise de vídeos de treino. No Windows local, o backend usa o binário de `ffmpeg-static`; a imagem Docker já instala `ffmpeg`.

## Primeira execução

```bash
npm install
docker compose up -d
npm --workspace backend run prisma:generate
npm --workspace backend run prisma:deploy
npm --workspace backend run seed
```

O PostgreSQL deste projeto usa a porta `5433` para não conflitar com instalações locais na porta padrão.

Em terminais separados:

```bash
npm run dev:backend
npm run dev:admin
npm run dev:mobile
```

- API: `http://localhost:3333/api`
- Painel: `http://localhost:5173`
- Expo: endereço exibido no terminal

## Acessos do seed

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Personal | `personal@essenza.com` | `Essenza@2026` |
| Aluna | `aluna@essenza.com` | `Essenza@2026` |

Troque essas credenciais e os segredos JWT antes de qualquer implantação.

## Mobile em aparelho físico

Copie `mobile/.env.example` para `mobile/.env` e substitua o IP pelo endereço IPv4 do computador:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:3333/api
```

No Expo Go em desenvolvimento, o app detecta automaticamente o host atual do Metro e usa esse mesmo IP na porta `3333`; a variável acima é o fallback. No emulador Android, o fallback usa `http://10.0.2.2:3333/api`. No simulador iOS, usa `localhost`. O projeto usa Expo SDK 54 para permanecer compatível com o Expo Go público da App Store no iPhone usado nos testes. Para produção ou módulos nativos adicionais, prefira um development build (`npx expo run:android` ou EAS Development Build).

## Banco e domínio

O schema usa UUIDs, índices de consulta, constraints de unicidade e exclusões em cascata somente onde o registro depende integralmente do pai. Avaliações corporais nunca são sobrescritas: cada medição tem data, autor e registro próprios.

Entidades principais: `User`, `StudentProfile`, `Program`, `Module`, `Lesson`, `StudentProgram`, `LessonProgress`, `BodyMeasurement`, `ProgressPhoto`, `NutritionProfile`, `CalorieEntry`, `TrainingAiMessage`, `CommunityPost`, `CommunityPostLike`, `CommunityPostComment`, `Announcement`, `Notification`, `RefreshToken` e `PasswordResetToken`.

## API principal

- `POST /api/auth/register`, `/login`, `/admin/login`, `/refresh`, `/logout`
- `POST /api/auth/forgot-password`, `/reset-password`, `/change-password`
- `GET|PUT /api/users/me`
- `GET /api/programs`, `/programs/:id`, `/modules/:id`, `/lessons/:id`
- `POST /api/lessons/:id/complete`
- `GET|POST /api/measurements`; `GET /api/measurements/evolution`
- `GET|POST /api/progress-photos`; `POST /api/uploads`
- `GET /api/nutrition/today`; `POST /api/ai/nutrition/analyze`; `DELETE /api/nutrition/entries/:id`
- `GET /api/ai/training/history`; `POST /api/ai/training/advice`
- `GET /api/community/posts`; curtidas e comentários/respostas sob `/api/community/posts/:id`
- `GET|POST /api/admin/community-posts/:id/comments` e `GET /api/admin/community-posts/:id/likes` para a administradora acompanhar as interações
- `GET /api/announcements`, `/notifications`
- CRUD administrativo sob `/api/admin`

Rotas administrativas exigem JWT de um usuário `ADMIN`. O middleware consulta novamente o status e a função do usuário no banco em cada requisição protegida.

## Recuperação de senha

Em desenvolvimento, a API devolve `developmentResetToken`, permitindo testar o fluxo sem serviço externo. Em produção, configure no `backend/.env`:

```env
SMTP_HOST=smtp.seuprovedor.com
SMTP_PORT=587
SMTP_USER=usuario
SMTP_PASS=senha
SMTP_FROM=Triade FIT <nao-responda@seudominio.com>
```

O retorno público permanece genérico para não revelar se um e-mail existe.

## Luna (OpenAI)

Configure somente no backend; nunca coloque a chave no `mobile`, em variável `EXPO_PUBLIC_*`, no painel ou no Git:

```env
OPENAI_API_KEY=cole_a_chave_no_arquivo_local
OPENAI_MODEL=gpt-5.6-luna
```

Depois de alterar o `.env`, reinicie a API. Fotos de alimentos são analisadas uma única vez por arquivo/dia. Para vídeos de treino, o backend extrai com `ffmpeg` até oito quadros distribuídos entre início, meio e fim e envia esses quadros à Luna; o arquivo MP4 não é reproduzido diretamente pelo modelo.

## Verificação

```bash
npm test
npm run build
npm --workspace backend run smoke   # requer API e banco em execução
cd mobile && npx expo export --platform android --output-dir dist
```

## Build Android

O perfil `preview` gera um APK instalável e compartilhável; `production` gera um AAB para a Play Store:

```bash
cd mobile
eas build --platform android --profile preview
eas build --platform android --profile production
```

Mudanças somente no backend, banco ou painel entram após o deploy da VPS e não exigem novo APK. Mudanças em `mobile/`, dependências Expo, `app.json`, `eas.json` ou em variáveis `EXPO_PUBLIC_*` exigem um novo build. O arquivo final fica no link do build exibido pelo EAS; o APK pode ser baixado desse link para envio pelo WhatsApp.

## Produção

- Use segredos JWT longos e exclusivos, banco gerenciado com TLS e domínio HTTPS.
- Restrinja `CORS_ORIGINS` aos domínios reais.
- Armazene uploads em um serviço de objetos (S3/R2 ou equivalente) e substitua o armazenamento local.
- Configure SMTP, observabilidade, backups, política de retenção e consentimento para dados corporais/fotos.
- Execute `prisma migrate deploy` no pipeline antes de iniciar a API.
- Mantenha `OPENAI_API_KEY` apenas no ambiente do container da API e confirme que `ffmpeg` existe na imagem.

Para subir API e PostgreSQL no seu VPS sem afetar os bots do PM2, siga o [guia de containers](docs/deploy-docker.md).
