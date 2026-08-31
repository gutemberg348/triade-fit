# Base técnica do projeto Triade FIT

> Documento de contexto permanente para desenvolvimento e manutenção.
>
> Última revisão completa: **28 de agosto de 2026**.

## 1. Para que este arquivo existe

Este é o primeiro arquivo que uma pessoa ou uma IA deve ler antes de alterar o projeto. Ele resume a arquitetura, o domínio, os fluxos, os contratos, as decisões e as limitações conhecidas. A intenção é evitar uma nova leitura integral do repositório toda vez que uma tarefa começar.

Este arquivo não substitui o código. Se houver divergência:

1. o comportamento executável do código é a verdade atual;
2. confirme a divergência com teste ou leitura do trecho relevante;
3. corrija este documento na mesma alteração para que ele volte a representar o projeto.

Ao concluir uma mudança estrutural, atualize pelo menos as seções afetadas e a data acima. Mudanças estruturais incluem novas entidades, rotas, telas, variáveis de ambiente, regras de autorização, scripts, integrações e dívidas técnicas resolvidas ou descobertas.

## 2. Resumo executivo

**Triade FIT** é uma plataforma de acompanhamento de alunos de personal trainer. Ela possui três aplicações no mesmo monorepo:

- um aplicativo mobile para a aluna, feito com Expo e React Native;
- um painel web administrativo para a personal, feito com React e Vite;
- uma API REST em Node.js/Express, ligada a PostgreSQL por Prisma.

O produto cobre cadastro e autenticação, programas de treino, módulos, aulas, meditação guiada, conclusão de aulas, avaliações corporais, gráficos e métricas semanais, conquistas, fotos de progresso, feed da comunidade, avisos, notificações internas e gestão de alunos.

Modelo mental do sistema:

```text
App mobile (aluna) ──────┐
                         ├── HTTP/JSON + Bearer JWT ── API Express ── Prisma ── PostgreSQL
Painel web (personal) ───┘                              │
                                                       ├── uploads locais
                                                       └── SMTP opcional
```

Não existem chamadas diretas dos clientes ao banco. Toda leitura ou mutação passa pela API.

## 3. Estado atual do projeto

Na criação deste documento, o projeto estava funcional como MVP e havia sido validado com:

- schema Prisma válido e migrations aplicadas até `202608280003_remove_lesson_calories`;
- seed executado;
- teste unitário do backend aprovado;
- build de produção do painel aprovado;
- Expo Doctor com 18 de 18 verificações aprovadas após o alinhamento ao SDK 54;
- exports iOS e web do Expo SDK 54 aprovados;
- smoke test REST com login de admin e aluna, dashboard, programa, medições e bloqueio administrativo por função.

O PostgreSQL local usa Docker e a porta `5433`. API, painel e Expo são processos de desenvolvimento e precisam ser iniciados quando necessários.

Credenciais locais criadas pelo seed:

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Personal/admin | `personal@essenza.com` | `Essenza@2026` |
| Aluna | `aluna@essenza.com` | `Essenza@2026` |

Essas credenciais são somente de desenvolvimento. O seed apaga os dados existentes antes de recriar a base; nunca deve ser executado em produção.

## 4. Estrutura do repositório

```text
personal/
├── admin/                       painel web da personal
│   ├── public/                  arquivos públicos do Vite
│   └── src/
│       ├── components/          layout, marca e componentes compartilhados
│       ├── contexts/            sessão administrativa
│       ├── hooks/               carregamento HTTP reutilizável
│       ├── pages/               páginas e formulários do painel
│       ├── services/            cliente Axios e tratamento de sessão
│       └── styles/              identidade visual global e responsividade
├── backend/                     API REST
│   ├── prisma/
│   │   ├── migrations/          histórico SQL versionado
│   │   ├── schema.prisma        modelo de dados canônico
│   │   └── seed.js              dados demonstrativos; destrutivo
│   ├── public/brand/             imagens editoriais padrão da marca Triade FIT
│   ├── scripts/smoke.js         teste integrado contra API em execução
│   └── src/
│       ├── config/              ambiente e cliente Prisma
│       ├── controllers/         entrada/saída HTTP e orquestração
│       ├── middlewares/         autenticação, autorização, validação e erros
│       ├── routes/              contratos e composição das rotas
│       ├── services/            regras reutilizáveis de domínio
│       ├── utils/               erros, criptografia, selects e async handler
│       └── validators/          schemas Zod
├── mobile/                      aplicativo Expo/React Native
│   ├── assets/                  capa, splash e ícones
│   └── src/
│       ├── components/          UI compartilhada
│       ├── contexts/            sessão da aluna
│       ├── navigation/          stacks e abas
│       ├── screens/             telas agrupadas por domínio
│       ├── services/            cliente Axios e renovação de sessão
│       └── theme/               tokens visuais mobile
├── design-reference/tokens.json tokens extraídos do protótipo
├── docs/base.md                 este documento
├── docker-compose.yml           PostgreSQL local
├── index.html                   protótipo visual original, preservado
├── package.json                 workspaces e scripts raiz
└── README.md                    início rápido resumido
```

Arquivos que normalmente devem ser lidos depois deste documento, conforme a tarefa:

- banco ou domínio: `backend/prisma/schema.prisma`;
- nova rota: arquivo em `backend/src/routes`, depois controller, validator e service correspondentes;
- autenticação: `backend/src/services/auth.service.js` e `backend/src/middlewares/auth.js`;
- painel: `admin/src/App.jsx`, a página afetada e `admin/src/services/api.js`;
- mobile: `mobile/src/navigation/AppNavigator.js`, a tela afetada e `mobile/src/services/api.js`;
- visual: `design-reference/tokens.json`, temas e CSS global.

## 5. Tecnologias e versões importantes

O repositório usa npm workspaces: `backend`, `admin` e `mobile`.

| Camada | Tecnologias principais |
| --- | --- |
| Backend | Node.js 20+, ESM, Express 5, Prisma 6, PostgreSQL 16, Zod 4 |
| Segurança | JWT, bcryptjs, tokens aleatórios com hash SHA-256, Helmet, CORS, rate limit |
| Upload/e-mail | Multer 2, armazenamento em disco, Nodemailer 9 |
| Admin | React 19.1, Vite 7, React Router 7, Axios, Recharts, Lucide |
| Mobile | Expo SDK 54, React Native 0.81.5, React Navigation 7, Axios |
| Persistência mobile | AsyncStorage |
| Banco local | imagem Docker `postgres:16-alpine` |

O aplicativo foi alinhado ao Expo SDK 54 em 18 de agosto de 2026 para funcionar com a versão pública do Expo Go disponível na App Store no iPhone usado nos testes. Uma atualização de SDK deve ser tratada como mudança técnica própria: conferir a versão mínima do Node, executar `npx expo install --fix`, Expo Doctor, export para as plataformas e teste em dispositivo.

O `package.json` raiz fixa versões de React e dependências nativas por `overrides`. Isso evita que o monorepo instale versões duplicadas incompatíveis. Não remova esses overrides sem conferir a árvore com `npm ls` e validar o Expo.

## 6. Como executar do zero

Pré-requisitos:

- Node.js 20 ou superior;
- npm;
- Docker Desktop com Docker Compose;
- para aparelho físico, computador e celular na mesma rede.

Na raiz:

```bash
npm install
docker compose up -d
npm --workspace backend run prisma:generate
npm --workspace backend run prisma:deploy
npm --workspace backend run seed
```

Em PowerShell, se os arquivos `.env` ainda não existirem:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item admin/.env.example admin/.env
Copy-Item mobile/.env.example mobile/.env
```

Depois, em terminais separados:

```bash
npm run dev:backend
npm run dev:admin
npm run dev:mobile
```

Endereços padrão:

| Serviço | Endereço |
| --- | --- |
| API | `http://localhost:3333/api` |
| Health check | `http://localhost:3333/api/health` |
| Admin | `http://localhost:5173` |
| PostgreSQL no host | `localhost:5433` |
| PostgreSQL dentro do container | `postgres:5432` |

O volume Docker `essenza_postgres` mantém os dados entre reinícios. `docker compose down` para o serviço, mas preserva o volume. Não use remoção de volume sem ter certeza de que os dados podem ser descartados.

### Mobile e endereços de rede

O cliente mobile resolve a API nesta ordem:

1. no Expo Go/desenvolvimento, usa o host atual do Metro (`expoConfig.hostUri`) com a porta `3333`;
2. fora desse fluxo, usa `EXPO_PUBLIC_API_URL`, se definida;
3. Android Emulator: `http://10.0.2.2:3333/api`;
4. iOS Simulator: `http://localhost:3333/api`.

Em aparelho físico, `localhost` aponta para o celular, não para o computador. O host automático evita que a conexão quebre quando o DHCP troca o IP durante o desenvolvimento. `mobile/.env` ainda deve manter um IPv4 válido como fallback:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.10:3333/api
```

Substitua o IP pelo endereço real e permita a porta `3333` no firewall local. Reinicie o bundler com cache limpo se a variável mudar:

```bash
npm --workspace mobile run start -- --clear
```

Se outro projeto já estiver usando `8081`, não encerre o processo sem confirmar sua origem. Inicie o Triade FIT em outra porta e inclua essa origem em `backend/.env`:

```bash
npm --workspace mobile run start -- --clear --port 8082
```

Em 24 de agosto de 2026, `8081` estava ocupada pelo projeto `escavadeira`; o Metro do Triade FIT foi iniciado em `exp://192.168.3.159:8082`. O IP é circunstancial e deve sempre ser reconfirmado com `ipconfig`.

O SDK 54 atual pode ser aberto pelo Expo Go público compatível. Para produção, bibliotecas nativas adicionais ou quando a App Store mudar a versão suportada, use um development build (`npx expo run:android` ou EAS Development Build).

## 7. Variáveis de ambiente

### Backend (`backend/.env`)

| Variável | Papel | Padrão/observação |
| --- | --- | --- |
| `NODE_ENV` | `development`, `test` ou `production` | `development` |
| `PORT` | porta HTTP | `3333` |
| `DATABASE_URL` | conexão PostgreSQL | obrigatória |
| `JWT_ACCESS_SECRET` | assinatura do access token | obrigatória, mínimo 32 caracteres |
| `JWT_REFRESH_SECRET` | reservada para refresh JWT | obrigatória hoje, porém não usada pelo fluxo atual |
| `ACCESS_TOKEN_TTL` | validade do access token | `15m` |
| `REFRESH_TOKEN_DAYS` | validade do refresh token opaco | `30` dias |
| `CORS_ORIGINS` | origens web separadas por vírgula | localhost 5173 e 8081 |
| `ADMIN_EMAIL` | e-mail do admin criado pelo seed | opcional |
| `ADMIN_PASSWORD` | senha do admin criado pelo seed | opcional |
| `SMTP_HOST` | habilita envio de recuperação | vazio desabilita SMTP |
| `SMTP_PORT` | porta SMTP | `587`; porta `465` ativa conexão segura direta |
| `SMTP_USER` / `SMTP_PASS` | credenciais SMTP | opcionais conforme servidor |
| `SMTP_FROM` | remetente | endereço Triade FIT padrão |

Em produção, segredos devem vir do gerenciador de secrets da infraestrutura, nunca do Git.

### Admin (`admin/.env`)

```env
VITE_API_URL=http://localhost:3333/api
```

Variáveis Vite entram no bundle do navegador. Nunca coloque segredo nelas.

### Mobile (`mobile/.env`)

```env
EXPO_PUBLIC_API_URL=http://IP-DA-MAQUINA:3333/api
EXPO_PUBLIC_WEB_API_URL=http://localhost:3333/api
```

Variáveis `EXPO_PUBLIC_*` também são públicas no aplicativo; use apenas configuração de endpoint.

## 8. Fluxo interno de uma requisição

Use este caminho para localizar bugs:

```text
Tela/página
  → cliente Axios
  → interceptor adiciona Authorization: Bearer <accessToken>
  → rota Express
  → authenticate consulta token e usuário atual no banco
  → authorize verifica ADMIN ou STUDENT quando necessário
  → validate aplica o schema Zod
  → controller coordena a operação
  → service concentra regra reutilizável
  → Prisma consulta ou altera PostgreSQL
  → JSON volta ao cliente
```

Organização do backend:

- **route** define método, caminho, middlewares e controller;
- **validator** define o contrato de entrada e conversões permitidas;
- **controller** cuida da semântica HTTP e orquestração;
- **service** concentra regras usadas em mais de um fluxo;
- **Prisma schema** define relações e integridade persistida;
- **error handler** normaliza as respostas de erro.

Ao criar uma funcionalidade, evite colocar toda a regra em uma rota ou dentro de um componente React.

## 9. Modelo de dados e regras de domínio

Todos os IDs são UUID. Datas de avaliação e foto usam o tipo PostgreSQL `DATE`; timestamps de criação, login e conclusão usam data e hora.

### Enums

- `Role`: `ADMIN`, `STUDENT`.
- `AccountStatus`: `ACTIVE`, `INACTIVE`, `ARCHIVED`.
- `PublishStatus`: `DRAFT`, `PUBLISHED`, `ARCHIVED`.
- `LessonKind`: `WORKOUT`, `MEDITATION`.
- `EnrollmentStatus`: `ACTIVE`, `COMPLETED`, `PAUSED`.
- `Audience`: `ALL`, `ACTIVE_STUDENTS`, `SPECIFIC_STUDENTS`.
- `PhotoPose`: `FRONT`, `SIDE`, `BACK`.

### Entidades

#### `User`

É a identidade de autenticação. Guarda e-mail único, hash da senha, função, status, nome, contato, avatar e datas de auditoria. Um aluno possui exatamente um `StudentProfile`; um admin não precisa de perfil de aluno.

O `passwordHash` nunca entra nos selects públicos. O middleware consulta o status do usuário no banco em cada requisição protegida, então uma conta inativada perde acesso mesmo que ainda possua access token válido.

#### `StudentProfile`

Separa dados específicos da jornada: objetivo, anotações internas, altura inicial, matrículas, progresso, medidas, fotos e destinatários de avisos. A relação com `User` é um para um e tem exclusão em cascata.

#### `Program`, `Module` e `Lesson`

Formam a hierarquia de conteúdo:

```text
Program 1 ── N Module 1 ── N Lesson
```

Cada nível tem status e `sortOrder`. Aulas podem conter descrição, capa, vídeo opcional, instruções, duração, categoria, tipo (`CONTENT`, `WORKOUT` ou `MEDITATION`), dificuldade, materiais JSON, notas, `isIntroductory` e `unlockDelayHours`. Materiais são uma lista de `{ title, url, type }`, em que `type` é `FILE` ou `LINK`. Meditações também possuem `showMeditationButton`: quando ativo, a aula mostra o botão de prática guiada mesmo que também tenha vídeo; quando inativo, a aula é somente vídeo e o vídeo é obrigatório. Para a aluna, somente conteúdo publicado deve aparecer.

A liberação é sequencial dentro do módulo para conteúdo `CONTENT` e em todo o programa para `TRAINING`: a primeira aula fica livre; as seguintes exigem a conclusão da aula imediatamente anterior. Se `unlockDelayHours` for maior que zero, a abertura ocorre em `completedAt + unlockDelayHours`. A API adiciona `availability` a cada aula e também bloqueia `GET /lessons/:id`; portanto o bloqueio não depende apenas da interface mobile.

`sortOrder` é único dentro de cada programa para módulos e dentro de cada módulo para aulas. A API calcula o próximo valor quando ele não é informado.

#### `StudentProgram`

É a matrícula entre perfil de aluna e programa. A combinação `studentId + programId` é única. Uma aluna só vê um programa se a matrícula estiver `ACTIVE` e o programa estiver publicado.

No cadastro público, a aluna é matriculada automaticamente em todos os programas publicados naquele momento. Quando um programa é criado ou atualizado como publicado, o backend também o atribui a todas as alunas ativas, usando `skipDuplicates`.

#### `LessonProgress`

Registra visualização e conclusão. A combinação aluna+aula é única. Abrir uma aula cria ou atualiza `lastViewedAt`; concluir define `completed` e `completedAt`. A conclusão pode ser desfeita pela API com `{ "completed": false }`, embora a tela atual só envie `true`.

O produto não estima nem soma calorias por aula. A migration `202608280003_remove_lesson_calories` removeu `Lesson.calories`; conclusão, admin e Evolução trabalham com aulas, treinos, minutos e dias ativos.

O percentual não é armazenado: é calculado contando aulas publicadas concluídas. Isso evita percentuais desatualizados quando o conteúdo muda.

#### `BodyMeasurement`

Cada avaliação é imutável do ponto de vista das APIs atuais: uma nova medição gera um novo registro. Campos disponíveis:

- data, peso, altura e IMC;
- percentual de gordura;
- cintura, abdômen, quadril e peitoral;
- braços direito e esquerdo;
- coxas direita e esquerda;
- panturrilhas direita e esquerda;
- observações e autor do registro.

O IMC é calculado apenas quando **peso e altura estão presentes na mesma requisição**. A altura inicial do perfil não é usada como fallback. O cálculo é `peso / (altura_em_metros²)`, arredondado para duas casas.

A medição pode ser criada pela própria aluna ou pelo admin. `recordedById` registra quem fez o lançamento e tem `onDelete: Restrict`, preservando a autoria.

#### `ProgressPhoto`

Guarda URL, pose, data e observações. O binário da imagem não fica no banco; a API atual salva o arquivo em `backend/uploads` e persiste somente a URL.

#### `Announcement`, `AnnouncementRecipient` e `Notification`

`Announcement` é o comunicado editorial. Pode ser rascunho, publicado ou arquivado e pode ter público geral, alunos ativos ou alunos específicos.

Para público específico, `AnnouncementRecipient` relaciona aviso e perfil de aluna. Na primeira publicação, a API também materializa uma `Notification` para cada usuário selecionado. Notificação tem `readAt`, mas o app atual exibe a lista de avisos e ainda não usa o estado de leitura.

#### `CommunityPost`

É a publicação editorial exibida no feed da comunidade. Guarda autor e avatar apresentados, texto, imagem opcional, status e data de publicação. O conteúdo é criado pelo admin. Cada aluna ativa pode curtir ou desfazer a curtida; `CommunityPostLike` impede mais de uma curtida da mesma conta. Comentários não fazem parte do produto.

#### `RefreshToken` e `PasswordResetToken`

Tokens sensíveis nunca são salvos em texto puro. A API entrega um valor aleatório ao cliente e guarda somente o hash SHA-256. Refresh tokens têm expiração, revogação, IP e user-agent. Tokens de recuperação expiram em uma hora e são marcados como usados após a troca.

## 10. Autenticação, sessão e autorização

### Login

O login retorna:

```json
{
  "accessToken": "jwt-curto",
  "refreshToken": "token-aleatorio-longo",
  "user": {
    "id": "uuid",
    "email": "aluna@essenza.com",
    "role": "STUDENT",
    "status": "ACTIVE",
    "name": "Alcione Souza",
    "studentProfile": {
      "id": "uuid",
      "objective": "...",
      "initialHeightCm": 165
    }
  }
}
```

O access token é um JWT assinado com `JWT_ACCESS_SECRET`, tem `sub=user.id`, inclui `role` e `sid` (ID da sessão) e dura 15 minutos por padrão. A autorização não confia apenas na função contida nele: o middleware relê a sessão, o usuário, a função e o status no banco. Se o refresh token ligado ao `sid` foi revogado, o access token também para de funcionar imediatamente.

O refresh token é opaco, aleatório e armazenado com hash. Na renovação, o token anterior é revogado e um novo par é emitido. Esse processo é rotação de refresh token.

### Armazenamento no cliente

- Admin: access token, refresh token e usuário ficam em `localStorage` com prefixo `essenza.`.
- Mobile: ficam no `AsyncStorage` nas chaves `accessToken`, `refreshToken` e `user`.

Os dois clientes possuem interceptor Axios. Uma resposta `401` fora de `/auth/*` dispara uma única promessa compartilhada de refresh, atualiza os tokens e repete a requisição uma vez. Se falhar, a sessão local é removida e a interface volta ao login. Ao iniciar, mobile e admin validam a sessão em `/users/me` em vez de confiar apenas no cache. O logout limpa a interface primeiro e tenta revogar a sessão no servidor sem bloquear a saída quando a rede está indisponível.

O mobile relê `/users/me` a cada quatro segundos e quando volta ao primeiro plano. Isso sincroniza ativação, bloqueio, vencimento ou inativação administrativa sem exigir novo login.

### Senhas

- hashes bcrypt com custo 12;
- senha entre 8 e 72 caracteres;
- exige ao menos uma letra e um número;
- troca autenticada exige a senha atual;
- troca ou recuperação revoga todos os refresh tokens ainda ativos;
- recuperação retorna mensagem genérica para não revelar se o e-mail existe;
- em desenvolvimento, o token aparece como `developmentResetToken` para permitir teste sem SMTP.

### Papéis

- todas as rotas `/api/admin/*` exigem `ADMIN`;
- conteúdo, medidas, fotos, avisos e notificações da aluna exigem `STUDENT`;
- `/api/users/me`, upload e troca de senha aceitam qualquer usuário autenticado;
- `/api/auth/login` aceita somente `STUDENT` e `/api/auth/admin/login` somente `ADMIN`;

## 11. Catálogo da API

Todas as rotas abaixo têm prefixo `/api`. Respostas de sucesso são JSON, exceto logout (`204`). Rotas protegidas recebem `Authorization: Bearer <accessToken>`.

### Públicas e autenticação

| Método | Rota | Uso |
| --- | --- | --- |
| `GET` | `/health` | saúde da API |
| `POST` | `/auth/register` | cadastrar aluna e iniciar sessão |
| `POST` | `/auth/login` | login geral usado pelo mobile |
| `POST` | `/auth/admin/login` | login exclusivo de admin |
| `POST` | `/auth/refresh` | rotacionar refresh token |
| `POST` | `/auth/logout` | revogar refresh token recebido |
| `POST` | `/auth/forgot-password` | solicitar recuperação |
| `POST` | `/auth/reset-password` | trocar senha com token |
| `POST` | `/auth/change-password` | trocar senha autenticada |

As rotas de autenticação, exceto logout e troca autenticada, compartilham limite de 20 requisições a cada 15 minutos por IP.

### Perfil autenticado

| Método | Rota | Uso |
| --- | --- | --- |
| `GET` | `/users/me` | retornar usuário público atual |
| `PUT` | `/users/me` | atualizar nome, telefone, nascimento, avatar, objetivo e altura inicial |
| `POST` | `/uploads` | enviar uma imagem no campo multipart `image` |
| `POST` | `/uploads/video` | enviar vídeo no campo multipart `video` |
| `POST` | `/uploads/file` | admin envia material no campo multipart `file` |

`/uploads` aceita imagem JPG, PNG ou WebP de até 8 MB. `/uploads/video` aceita MP4, WebM ou MOV de até 150 MB. `/uploads/file`, restrito a admin, aceita PDF, TXT, Word, Excel, PowerPoint e ZIP de até 25 MB. Todos retornam a URL final; o upload de material também devolve nome original, MIME e tamanho.

### Pagamento autenticado

| Método | Rota | Uso |
| --- | --- | --- |
| `GET` | `/billing/me` | plano, acesso e último pedido |
| `POST` | `/billing/initial-plan/pix` | criar cobrança e devolver QR Code/copia e cola |
| `POST` | `/billing/initial-plan/card` | processar cartão diretamente no Asaas |
| `POST` | `/billing/initial-plan/sync` | consultar manualmente a última cobrança |
| `POST` | `/billing/asaas/webhook` | receber eventos autenticados do Asaas |

As rotas Pix e cartão recebem CPF/CNPJ, telefone, CEP, endereço, número, complemento e bairro. A rota de cartão recebe também titular, número, mês/ano de validade e CVV; esses campos sensíveis existem apenas na memória da requisição e nunca entram no Prisma.

### Conteúdo da aluna

| Método | Rota | Uso |
| --- | --- | --- |
| `GET` | `/programs` | programas publicados matriculados, com progresso |
| `GET` | `/programs/:id` | programa e módulos/aulas publicados |
| `GET` | `/modules/:id` | módulo e aulas |
| `GET` | `/lessons/:id` | aula, vizinhas e registro de visualização |
| `POST` | `/lessons/:id/complete` | concluir ou reabrir aula |

Exemplo para conclusão:

```json
{ "completed": true }
```

### Avaliações e fotos

| Método | Rota | Uso |
| --- | --- | --- |
| `GET` | `/measurements` | histórico decrescente e autor |
| `POST` | `/measurements` | nova avaliação da própria aluna |
| `GET` | `/measurements/evolution` | medidas, comparação, totais históricos, atividade dos últimos 7 dias e conquistas |
| `GET` | `/progress-photos` | fotos mais recentes primeiro |
| `POST` | `/progress-photos` | registrar metadados de foto já enviada |

Exemplo mínimo de medida:

```json
{
  "measuredAt": "2026-08-18",
  "weightKg": 72.4,
  "heightCm": 165
}
```

Strings vazias nos campos numéricos são convertidas em `null`. Números precisam ser positivos e respeitar os limites do validator.

Fluxo de foto em duas etapas:

1. enviar multipart em `POST /uploads`;
2. enviar a URL recebida, pose, data e observações em `POST /progress-photos`.

### Comunidade e avisos da aluna

| Método | Rota | Uso |
| --- | --- | --- |
| `GET` | `/announcements` | até 50 avisos publicados visíveis |
| `GET` | `/community/posts` | até 50 postagens publicadas do feed |
| `POST` | `/community/posts/:id/like` | curtir uma postagem |
| `DELETE` | `/community/posts/:id/like` | remover a própria curtida |
| `GET` | `/notifications` | até 50 notificações do usuário |
| `PATCH` | `/notifications/:id/read` | marcar notificação própria como lida |

### Administração

| Método | Rota | Uso |
| --- | --- | --- |
| `GET` | `/admin/dashboard` | métricas, acessos e avaliações recentes |
| `GET` | `/admin/students` | busca e paginação de alunos |
| `POST` | `/admin/students` | criar aluno e matrículas informadas |
| `GET` | `/admin/students/:id` | ficha completa e evolução |
| `PUT` | `/admin/students/:id` | dados, status, perfil e matrículas |
| `PUT` | `/admin/students/:id/password` | redefinir senha e encerrar todas as sessões da aluna |
| `DELETE` | `/admin/students/:id` | excluir permanentemente a aluna e seus dados dependentes |
| `POST` | `/admin/students/:id/measurements` | avaliação feita pela personal |
| `GET` | `/admin/programs` | árvore não arquivada de conteúdo |
| `POST` / `PUT` / `DELETE` | `/admin/programs[/:id]` | criar, editar ou arquivar programa |
| `POST` / `PUT` / `DELETE` | `/admin/modules[/:id]` | criar, editar ou arquivar módulo |
| `POST` / `PUT` / `DELETE` | `/admin/lessons[/:id]` | criar, editar ou arquivar aula |
| `GET` | `/admin/announcements` | listar todos os avisos |
| `POST` | `/admin/announcements` | criar aviso |
| `PUT` | `/admin/announcements/:id` | editar/publicar aviso |
| `GET` | `/admin/community-posts` | listar postagens do feed |
| `POST` | `/admin/community-posts` | criar postagem do feed |
| `PUT` | `/admin/community-posts/:id` | editar/publicar postagem do feed |

Os `DELETE` de conteúdo são soft delete: apenas mudam `status` para `ARCHIVED`. Não apagam linhas nem dados de progresso.

Paginação de alunos aceita `page`, `limit` (máximo 100), `search` e `status`. O retorno é `{ items, total, page, pages }`.

### Erros

Formato normal:

```json
{
  "error": "Não foi possível salvar: Informe um e-mail válido.",
  "details": {
    "fieldErrors": {
      "email": ["Informe um e-mail válido."]
    },
    "formErrors": []
  }
}
```

O middleware `validate` converte mensagens técnicas do Zod para português e conserva erros separados por campo. O helper `errorMessage` do admin transforma `details.fieldErrors` em uma lista com rótulos legíveis para todos os formulários. O cadastro de aluna também usa `validationErrors` para marcar o input inválido e exibir a orientação logo abaixo, limpando apenas o erro do campo que está sendo corrigido.

Status comuns:

- `400`: token de recuperação ou regra de negócio inválida;
- `401`: sessão ausente, inválida ou expirada;
- `403`: papel sem permissão, conta inativa ou origem CORS negada;
- `404`: rota ou registro não encontrado;
- `409`: conflito de unicidade do Prisma;
- `422`: validação de payload ou upload;
- `429`: limite de autenticação excedido;
- `500`: erro interno sem exposição de detalhes sensíveis.

## 12. Backend em detalhes

`backend/src/server.js` abre a porta e encerra servidor e Prisma de forma graciosa em `SIGINT`/`SIGTERM`.

`backend/src/app.js` monta middlewares nesta ordem:

1. `trust proxy`;
2. Helmet;
3. CORS por allowlist;
4. parser JSON de 1 MB e formulário URL encoded;
5. arquivos estáticos em `/uploads`;
6. Morgan fora de testes;
7. health check e rotas;
8. 404 e error handler.

Pontos centrais:

- `auth.service.js`: cadastro, login, emissão/rotação/revogação e senhas;
- `measurement.service.js`: cálculo de IMC, serialização de Decimal e comparação;
- `progress.service.js`: percentuais e verificação de acesso à aula;
- `admin.controller.js`: operações administrativas e transações complexas;
- `selects.js`: campos públicos de usuário;
- `crypto.js`: token aleatório e hash;
- `validate.js`: substitui body/query/params pelos dados já analisados pelo Zod.

Valores Prisma `Decimal` são convertidos para `number` antes da resposta nas medições. Ao adicionar novos campos decimais a outras respostas, confirme a serialização para não entregar objetos inesperados ao cliente.

## 13. Painel administrativo

Rotas web em `admin/src/App.jsx`:

| URL | Página |
| --- | --- |
| `/login` | autenticação da personal |
| `/dashboard` | métricas e atividade recente |
| `/alunos` | busca e cadastro de alunos |
| `/alunos/:id` | ficha, edição, status, medidas, gráfico, fotos e progresso |
| `/programas` | abas simplificadas de módulos da Home e programas de treino, ambos com aulas diretas |
| `/avisos` | comunidade: postagens do feed e avisos |
| `/configuracoes` | identidade do app, imagens, banners e precificação do plano |

A rota protegida só renderiza o layout quando o usuário persistido tem `role === "ADMIN"`. O backend continua sendo a autoridade real.

Comportamentos importantes:

- páginas pesadas usam `lazy` e `Suspense`;
- `useApi` concentra estado inicial, erro e recarga de GET;
- busca de alunos tem debounce de 300 ms e pede até 50 registros;
- cadastro de aluno usa senha inicial preenchida e envia `programIds: []`;
- ficha do aluno permite ativar/inativar, editar dados, redefinir senha com revogação de sessões, excluir com confirmação forte e adicionar avaliação;
- módulos da Home e programas de treino são geridos separadamente; “excluir” arquiva;
- a tela de Programas normaliza respostas e registros legados sem `modules`/`lessons` como listas vazias, evitando que um item antigo derrube o painel inteiro;
- a área Comunidade separa postagens e avisos, permite upload ou URL de imagem e controla publicação/rascunho;
- Configurações do app publica textos, imagem de login, banners e preços de Pix/cartão com prévia do cálculo de juros;
- o cadastro de aulas permite definir conteúdo, treino ou meditação, duração, nível, vídeo por URL/upload, materiais por arquivo/link, atraso de liberação e o formato “prática guiada” ou “somente vídeo”. A área de vídeo mostra progresso do upload, prévia antes de salvar e aceita YouTube, Vimeo ou mídia HTTPS direta; o timeout específico do upload é de 180 segundos;
- avisos do painel oferecem hoje apenas `ALL` e `ACTIVE_STUDENTS`;
- `SPECIFIC_STUDENTS` existe na API, mas ainda não possui seletor de alunos na interface;
- o painel não possui interface de atribuição de programas ao aluno, embora a API aceite `programIds`.

Identidade visual do painel administrativo:

- dashboard monocromático em preto, grafite e branco;
- fonte Inter com pesos 400 a 800;
- branco para ações principais e contraste alto;
- cinzas para estados e hierarquia visual; vermelho fica reservado a ações destrutivas.

O `design-reference/tokens.json` preserva a referência original. O aplicativo mobile usa a mesma direção marrom/preto com cobre do protótipo, centralizada em `mobile/src/theme/index.js`. Textos principais usam creme/branco e peso alto para permanecerem legíveis sobre as superfícies escuras; nunca deixe um `Text` sem cor explícita dentro de um cartão escuro.

## 14. Aplicativo mobile

O `AppNavigator` decide toda a árvore com base na existência de usuário local.

Sem sessão:

```text
Login → Cadastro
      → Esqueci a senha → Redefinir senha
```

Com sessão:

```text
Tabs
├── Início
├── Treinos
├── Evolução
├── Comunidade
└── Perfil

Telas empilhadas: Programa, Aula, Sessão de meditação, Nova medição, Nova foto,
Dados pessoais e Alterar senha.
```

Responsabilidade das telas:

- **Cadastro**: pede somente nome, e-mail, senha e confirmação; telefone e código de indicação são opcionais. Não pergunta objetivo/interesse nessa etapa. A validação acontece antes do envio e a resposta `422` da API é exibida no campo correspondente, sem limpar os demais valores digitados;
- **Início**: carrega `/home-content` e avisos em paralelo; apresenta todas as aulas marcadas como introdutórias em carrossel, módulos com capa/progresso e comunicação recente. Se nenhuma estiver marcada, usa as três primeiras aulas publicadas como contingência;
- **Treinos**: lista somente programas `TRAINING` e abre as aulas/exercícios diretamente, sem módulo visual;
- **Aula**: mostra capa/vídeo, duração, nível/categoria, instruções, anterior/próxima e ação de conclusão. Arquivos enviados e URLs de mídia direta usam `expo-video`; links de YouTube/Vimeo são convertidos para reprodução incorporada com `react-native-webview` no Android/iOS e `iframe` na web. O carregamento possui limite de 15 segundos e, em falha, oferece nova tentativa e abertura externa em vez de manter spinner infinito;
- **Meditação**: uma aula marcada como “prática guiada” abre o cronômetro circular com iniciar, pausar e conclusão automática. Ela é acessada pelo botão da própria aula, não por uma aba inferior;
- **Evolução**: destaca consistência, aulas, treinos, minutos, dias ativos, gráfico semanal, conquistas, medidas, comparação inicial/atual, histórico e fotos. No painel preenchido, “Nova medida” é uma ação compacta no cabeçalho e a evolução corporal aparece antes do resumo semanal; não existe mais um botão laranja de largura total repetido abaixo do gráfico. Sem nenhuma medição, mostra sempre o onboarding de medidas iniciais e o botão de cadastro; após o primeiro registro, abre o painel completo. Frontend e `measurementSchema` exigem pelo menos uma medida numérica para impedir um registro inicial vazio;
- **Nova medição**: abre com Peso, Cintura, Quadril e Gordura; data, observação e medidas detalhadas ficam recolhidas para reduzir atrito, mas todos os campos corporais continuam disponíveis. A medição inicial é recomendada, não obrigatória: a aluna pode usar **Agora não** no convite ou **Fechar** no formulário sem criar um registro;
- **Nova foto**: escolhe imagem, envia arquivo e registra pose/data;
- **Comunidade**: alterna entre postagens do feed e avisos publicados pelo painel; imagens das postagens abrem em visualização ampliada e o coração permite curtir/descurtir sem exibir contagem;
- **Perfil**: exibe conta, edita dados e avatar, troca senha e encerra sessão.

O aplicativo Android está configurado como `com.triadefit.app`, em orientação retrato e tema escuro. O ícone principal é `mobile/assets/icon-essenza.png`; a splash usa `mobile/assets/splash.png`.

Em agosto de 2026, as telas mobile de home, programas e evolução foram redesenhadas com metadados visuais de aula, números/ícones com hierarquia editorial, métricas históricas e semanais, conquistas, barras de progresso acessíveis, cartão de gráfico com escala/data, resumo de variação, histórico legível e cadastro de medidas em camadas. Programas usam apresentação de catálogo: módulos têm capa ampla e capítulos possuem miniatura numerada, ícone de estado, metadados e estado bloqueado. A tela do capítulo exibe arquivos/links em uma seção própria. A tela `MeditationSessionScreen` é acessada dentro da aula quando o admin habilita a prática guiada; o feed de comunidade também foi incluído. O app carrega Inter via `@expo-google-fonts/inter` no `App.js`; ao criar novas telas, use os tokens de `theme/index.js`, os componentes de `components/UI.js`, a paleta carvão/cobre e contraste alto. Não use fonte serif.

As imagens padrão da dona e da campanha ficam em `backend/public/brand`: `triade-fit-login.png`, `triade-fit-home.png`, `triade-fit-focus.png` e `triade-fit-balance.png`. Elas foram preparadas para login, home e capas de módulos, sem texto embutido, permitindo sobreposição de UI nativa. O admin pode substituí-las por upload/URL a qualquer momento.

Na entrada, o mobile guarda a última resposta de `/app-config` no AsyncStorage e pré-carrega uma nova `loginImageUrl` antes de exibi-la. Na primeira instalação, mostra apenas um estado de carregamento da marca enquanto consulta a configuração; não mostra uma capa padrão e depois a troca pela capa administrativa. Os formulários de autenticação usam rolagem, `KeyboardAvoidingView` e `android.softwareKeyboardLayoutMode = resize` para manter o campo focado visível acima do teclado.

Ao criar programa, módulo ou capítulo sem capa, o backend escolhe automaticamente uma dessas imagens de marca; portanto o catálogo nunca precisa nascer com miniatura vazia. Uma capa enviada pela Personal sempre substitui esse padrão.

Após atualizar perfil, `refreshUser()` relê `/users/me` e substitui o usuário no AsyncStorage. Após alterar senha, a UI orienta novo login e executa logout.

## 15. Acesso comercial, pagamentos e parceiros

O cadastro (`User.status`) e a liberação comercial são coisas diferentes:

- `User.status`: estado técnico da conta (`ACTIVE`, `INACTIVE`, `ARCHIVED`);
- `StudentProfile.accessStatus`: estado comercial do acesso. Novas pessoas entram como `PENDING_PAYMENT`; contas existentes foram migradas como `ACTIVE` para não perderem acesso;
- conteúdo, progresso, medidas e fotos exigem `accessStatus = ACTIVE`. Isso impede que apenas criar a conta libere o programa.

### Pagamento Asaas dentro do app

A integração usa `ASAAS_ENV=sandbox` com uma chave da Sandbox e processa o pagamento sem abrir navegador. Os dados fiscais são solicitados somente na tela de pagamento. O Pix devolve imagem Base64 do QR Code e código copia e cola; o cartão é enviado diretamente ao Asaas e número/CVV nunca são persistidos nem registrados em log. Em produção, ambiente e chave devem ser trocados juntos e toda captura de cartão deve ocorrer exclusivamente em HTTPS.

Na web, a saída de conta usa `window.confirm`; no iOS/Android usa `Alert.alert`. Assim a confirmação aparece nos dois ambientes antes de limpar a sessão.

Estados comerciais disponíveis: `PENDING_PAYMENT`, `ACTIVE`, `OVERDUE`, `BLOCKED` e `CANCELLED`. Na ficha do aluno, o botão **Liberar plano por 12 meses** ativa e define o vencimento automaticamente; **Bloquear plano** interrompe o acesso. O editor continua permitindo escolher qualquer estado e data manualmente.

O módulo de parceiros usa três entidades:

- `PartnerProfile`: transforma uma aluna em parceira, guarda código único de indicação, valor-padrão de crédito e saldo em centavos;
- `Referral`: relaciona a pessoa indicada à parceira. É criada como `PENDING` pelo cadastro administrativo com parceira ou pelo código usado no cadastro público;
- `PartnerLedgerEntry`: registro imutável de saldo. Quando a indicação passa para acesso `ACTIVE`, a indicação é aprovada e o crédito definido cai no saldo da parceira uma única vez.

O menu **Parceiros e saldo** permite consultar códigos, indicações e fazer ajustes manuais. Para selecionar alguém como parceira, abra a ficha em **Alunos** e use **Tornar parceiro**. A integração Asaas chama a mesma regra de liberação comercial após o webhook de pagamento aprovado e atualiza `accessStatus`.

### Capas de conteúdo

No admin, programas, módulos e aulas aceitam `coverUrl` de duas formas: URL externa ou upload de JPG, PNG e WebP (até 8 MB). O upload usa `POST /api/uploads` e grava a URL retornada no mesmo campo, portanto o mobile usa uma única fonte para exibir a capa.

## 16. Seed e dados demonstrativos

`backend/prisma/seed.js` executa exclusões em ordem de dependência e recria:

- uma admin de demonstração chamada Marina Triade;
- uma aluna chamada Alcione Souza;
- o programa publicado “Projeto Triade FIT”;
- quatro módulos, oito treinos e duas meditações;
- matrícula da aluna;
- duas aulas concluídas;
- três avaliações corporais entre junho e agosto de 2026;
- um aviso publicado, uma notificação e uma postagem da comunidade.

A capa do seed usa `http://localhost:5173/essenza-cover.png`. Isso funciona no navegador local com o painel aberto, mas não é uma URL adequada para aparelho físico nem produção. Ao preparar implantação, mova a capa para armazenamento público/backend e altere os dados.

Regra crítica: **o seed apaga toda a base antes de recriar os exemplos**. Use-o somente em ambiente descartável de desenvolvimento.

## 17. Comandos de trabalho e validação

O painel facilita o cadastro de aulas de meditação com a opção **Botão para prática guiada** ou **Somente vídeo**. Em ambos os casos o vídeo aceita URL ou upload MP4, WebM e MOV de até 150 MB; MP4 é o formato recomendado pela compatibilidade entre Android e iOS. A prévia reconhece YouTube e Vimeo. Para a opção somente vídeo, o backend impede salvar sem vídeo. O Nginx deve usar `client_max_body_size 160M`, pois o envelope multipart acrescenta alguns bytes ao arquivo cujo limite real na API é 150 MB.

Na raiz:

```bash
npm run dev:backend       # API com node --watch
npm run dev:admin         # Vite
npm run dev:mobile        # Expo
npm test                  # testes do backend
npm run build             # check backend + build admin
```

Banco e Prisma:

```bash
npm --workspace backend run prisma:generate
npm --workspace backend run prisma:migrate -- --name nome_da_mudanca
npm --workspace backend run prisma:deploy
npm --workspace backend run seed
```

Validação mais completa:

```bash
npm test
npm run build
npm --workspace backend run smoke
cd mobile
npx expo-doctor
npx expo export --platform android --output-dir dist
```

O smoke test requer PostgreSQL e API em execução, além dos dados do seed. Ele valida autenticação e acessos principais; não substitui uma suíte de integração isolada.

Antes de mudar o schema:

1. altere `schema.prisma`;
2. gere migration com nome descritivo;
3. revise o SQL gerado, especialmente deletes, defaults e colunas obrigatórias;
4. rode `prisma:generate`;
5. aplique em banco local e teste dados existentes;
6. atualize seed, tipos implícitos dos clientes e este documento.

## 17. Como implementar uma nova funcionalidade

Exemplo de sequência segura para um novo recurso de domínio:

1. escreva a regra em uma frase: quem pode fazer o quê e em qual estado;
2. decida se exige mudança no schema e migration;
3. crie ou altere o validator Zod;
4. adicione a rota com `authenticate`, `authorize` e `validate` corretos;
5. coloque regra reutilizável em service e orquestração no controller;
6. confirme status HTTP, formato de sucesso e formato de erro;
7. implemente o cliente sem duplicar a regra de autorização;
8. trate loading, vazio, erro e sucesso na UI;
9. teste papel permitido, papel proibido, payload inválido e registro inexistente;
10. execute build/testes e atualize `docs/base.md`.

Para uma nova página admin:

- adicione a rota em `admin/src/App.jsx`;
- decida se deve entrar no menu de `components/Layout.jsx`;
- use o cliente `services/api.js` para manter refresh automático;
- reutilize componentes de `components/UI.jsx` e classes existentes;
- confira desktop, notebook e tablet.

Para uma nova tela mobile:

- registre a tela no stack ou nas tabs de `AppNavigator.js`;
- mantenha chamadas em `services/api.js`;
- use componentes comuns e tokens do tema;
- recarregue dados em foco quando a tela de edição voltar;
- teste Android e, quando disponível, iOS;
- confira teclado, safe area, loading, erro, lista vazia e rede lenta.

## 18. Convenções que não devem ser quebradas sem decisão explícita

- Código JavaScript usa ESM.
- Senhas nunca saem do backend em hash ou texto.
- E-mails são normalizados para minúsculas antes de persistir/login.
- IDs de rota são validados como UUID.
- Toda rota de dado pessoal exige autenticação.
- Toda rota administrativa exige `ADMIN` no backend.
- Histórico corporal é append-only nas APIs atuais.
- Conteúdo removido pela personal é arquivado, não apagado.
- Refresh token é rotacionado a cada uso e salvo apenas como hash.
- Componentes não devem acessar PostgreSQL nem conhecer `DATABASE_URL`.
- URLs e segredos específicos de ambiente não devem ser hardcoded em novo código.
- Alterações de banco devem ter migration; não use `db push` como processo de produção.
- Não rode `npm audit fix --force` sem revisar quebras de Prisma, Expo e Metro.
- Preserve `index.html` como referência visual original.

## 19. Limitações e dívidas técnicas conhecidas

Esta lista é deliberadamente explícita para impedir que limitações sejam confundidas com bugs recém-criados.

### Produto e regras

- Não há seletor de matrículas no painel; aluno criado pelo painel recebe `programIds: []`.
- Publicar novo programa não matricula alunos existentes.
- Público `SPECIFIC_STUDENTS` funciona na API, mas não no formulário admin.
- `ALL` e `ACTIVE_STUDENTS` têm efeito praticamente igual hoje, pois usuários inativos não conseguem entrar e a criação de notificações filtra ativos.
- Notificações possuem leitura no backend, mas o app usa avisos e não chama as rotas de leitura.
- Não há push notification, tokens de dispositivo ou integração APNs/FCM/Expo Push.
- Não existem APIs/UI para apagar ou corrigir medições e fotos.
- Não existe exclusão de aviso; apenas edição/status pela API.
- Status da matrícula não muda automaticamente para `COMPLETED` quando todas as aulas terminam.
- A aluna pode criar a própria avaliação. Validar se essa é a regra comercial desejada.

### Autenticação e segurança

- `JWT_REFRESH_SECRET` é validada, mas o refresh atual é opaco e não usa esse segredo. Remover a variável ou mudar conscientemente o modelo.
- Admin guarda tokens em `localStorage`; para maior proteção contra XSS, considerar cookie `HttpOnly`, `Secure` e `SameSite` com estratégia CSRF apropriada.
- Mobile guarda tokens em AsyncStorage, que não é cofre criptográfico; considerar `expo-secure-store` para refresh token.
- Upload confia no MIME informado pelo cliente e não redimensiona, remove metadados EXIF nem verifica malware.
- O limite de 20/15 min também cobre refresh e pode afetar uso intenso atrás de um mesmo IP.

### Dados e backend

- Arquivos locais não são removidos quando a referência no banco muda; podem existir órfãos.
- Disco local não serve para múltiplas instâncias nem deploy efêmero. Migrar para S3/R2/serviço equivalente.
- A capa do seed aponta para `localhost:5173`, inadequado para app físico/produção.
- Atualizar um aviso já publicado não atualiza notificações existentes; mudar público depois da primeira publicação também não cria notificações para os novos destinatários.
- `GET /modules/:id` exige módulo publicado e matrícula, mas não verifica explicitamente que o programa pai está publicado; alinhar com as demais consultas.
- Vários tokens de recuperação podem coexistir até uso/expiração. Uma nova solicitação não invalida as anteriores.
- Não há transação entre salvar arquivo e criar registro da foto; falha na segunda etapa deixa arquivo órfão.
- `sortOrder` informado manualmente pode gerar conflito de unicidade; não há endpoint de reordenação atômica.

### Qualidade e operação

- A cobertura automatizada é pequena; o smoke depende de ambiente compartilhado e dados seedados.
- Não há CI/CD versionado, observabilidade, tracing, métricas de aplicação ou alerta.
- Não há política implementada de backup, retenção, exportação ou exclusão LGPD para medidas e fotos.
- SMTP é opcional e precisa ser configurado em produção.
- `npm audit` ainda pode reportar advisories transitivos das cadeias Expo/Metro e Prisma CLI. Foram evitadas correções forçadas por risco de quebra.
- A configuração de seed no campo `prisma` do `package.json` gera aviso de depreciação em versões recentes; migração futura pode exigir `prisma.config`.
- `/configuracoes` no painel e preferências/privacidade no app são placeholders.

## 20. Diagnóstico rápido

### API não inicia

1. confira `backend/.env`;
2. confirme que os dois segredos têm pelo menos 32 caracteres;
3. execute `docker compose ps`;
4. teste a porta `5433` e a `DATABASE_URL`;
5. rode `npm --workspace backend run prisma:generate`;
6. rode `npm --workspace backend run prisma:deploy`;
7. leia o primeiro erro, não somente o erro final do cliente.

### Prisma não conecta

- host local deve ser `localhost:5433`;
- de outro container, normalmente seria `postgres:5432`;
- confirme usuário `essenza`, banco `essenza` e senha de desenvolvimento;
- confira se o container está saudável e se outra aplicação ocupou a porta.

### Admin abre, mas as chamadas falham

- API deve responder em `/api/health`;
- `VITE_API_URL` precisa terminar em `/api`;
- origem do painel deve estar em `CORS_ORIGINS`;
- limpe as chaves `essenza.*` do localStorage se uma sessão antiga ficou inválida;
- confirme que usou `/auth/admin/login` e uma conta `ADMIN` ativa.

### Mobile não conecta

- aparelho físico não pode usar `localhost`;
- ajuste `EXPO_PUBLIC_API_URL` com IP da máquina e `/api`;
- confirme mesma rede e firewall;
- reinicie Expo com `--clear`;
- no Android Emulator, use o fallback `10.0.2.2`;
- URLs de imagens retornadas pela API também precisam ser alcançáveis pelo dispositivo.

### Recebe `401` repetidamente

- confira relógio do sistema e TTL;
- verifique se o usuário está ativo;
- verifique se refresh foi rotacionado por outro cliente e o token local ficou antigo;
- limpe a sessão e faça novo login;
- confira se a requisição de refresh foi limitada por rate limit.

### Recebe `403`

- `401` significa sessão; `403` normalmente significa função errada ou CORS;
- admin não pode usar rotas de aluna e aluna não pode usar `/admin`;
- inspecione a mensagem JSON devolvida.

### Imagem envia, mas não aparece

- confirme multipart com campo chamado exatamente `image`;
- formato deve ser JPG, PNG ou WebP e até 8 MB;
- confirme que a URL usa host alcançável pelo cliente;
- confira diretório `backend/uploads` e rota estática `/uploads`;
- em produção, não dependa de filesystem efêmero.

### Migration falha

- não apague migration já aplicada para “resolver”;
- compare `_prisma_migrations` com a pasta versionada;
- revise se a alteração introduziu coluna obrigatória em tabela com dados;
- faça backup antes de mudanças destrutivas;
- use `migrate dev` localmente e `migrate deploy` em implantação.

## 21. Checklist antes de entregar uma mudança

- [ ] A regra de negócio está clara e implementada também no backend.
- [ ] Rotas têm autenticação, autorização e validação adequadas.
- [ ] Não há segredo ou credencial real no código/bundle.
- [ ] Estados de loading, erro, vazio e sucesso foram tratados.
- [ ] O comportamento foi testado com o papel correto e com papel proibido.
- [ ] Migration foi criada e revisada quando o schema mudou.
- [ ] Seed continua coerente e foi usado apenas em base descartável.
- [ ] `npm test` passou.
- [ ] `npm run build` passou.
- [ ] Alteração mobile relevante passou no Expo Doctor/export e em dispositivo quando possível.
- [ ] Upload, CORS e endereço de API foram considerados fora de localhost.
- [ ] Este documento foi atualizado se a mudança alterou o contexto permanente.

## 22. Cobrança e liberação de acesso (Asaas)

O primeiro plano comercial continua sendo de acesso por período e cobrança única; nome, duração, preço no Pix, preço-base no cartão, quantidade de parcelas e juros são configurados em **Configurações do app** no painel. Não existe renovação automática implementada neste momento.

### Fluxo completo

Na tela de pagamento, e-mail e telefone partem dos dados da conta. CPF/CNPJ, telefone, CEP, número do cartão, validade e CVV recebem máscara e limite durante a digitação. Ao completar oito números do CEP, o mobile consulta o ViaCEP e preenche rua e bairro automaticamente. O preenchimento manual continua disponível se o serviço externo estiver indisponível.

1. ao criar uma conta de aluna, `StudentProfile.accessStatus` começa em `PENDING_PAYMENT`;
2. a navegação mobile mostra apenas a tela de acesso pendente e o backend recusa conteúdo, medidas e avisos protegidos;
3. a tela consulta `GET /api/app-config`, apresenta separadamente o total no Pix e o total/parcelas/juros do cartão e espera a escolha da cliente;
4. para Pix, o app envia os dados fiscais a `POST /api/billing/initial-plan/pix`; o backend cria/atualiza a cliente no Asaas, cria a cobrança e devolve o QR Code e o copia e cola;
5. para cartão, o app envia dados fiscais e dados do cartão a `POST /api/billing/initial-plan/card` com timeout maior; o backend repassa diretamente ao Asaas sem salvar ou registrar os dados sensíveis;
6. cartão aprovado como `CONFIRMED` ou `RECEIVED` libera o acesso na própria resposta. Pix é assíncrono e pode ser conferido pelo botão “Já paguei”, que chama `POST /api/billing/initial-plan/sync`;
7. em produção, o Asaas também chama `POST /api/billing/asaas/webhook`; eventos `PAYMENT_CONFIRMED` ou `PAYMENT_RECEIVED` mudam o acesso para `ACTIVE` de forma idempotente;
8. após a confirmação, `refreshUser()` atualiza o perfil e a navegação troca automaticamente para as abas do app.

`PaymentOrder` conserva referência interna, valor em centavos, meio de pagamento, duração contratada, ID da cobrança e estado. Isso impede que uma edição posterior de preço altere um pedido já criado. `PaymentWebhookEvent` guarda o identificador do evento do gateway para ignorar reentregas: Webhooks do Asaas podem chegar mais de uma vez. Uma indicação pendente só gera saldo ao parceiro quando esse mesmo pagamento é confirmado.

### Configurações administráveis do aplicativo

A entidade singleton `AppConfig` (`id = app`) é a fonte de verdade para:

- nome e textos da tela de login;
- imagem de login, banner inicial e banner da oferta/pagamento;
- rótulo do banner inicial;
- nome, descrição e duração do plano;
- preço total no Pix;
- preço-base, número de parcelas e percentual total de juros do cartão.

O painel lê e grava por `GET/PUT /api/admin/app-config`, protegidos por papel `ADMIN`. O login e o app usam `GET /api/app-config`, que é público porque precisa funcionar antes da autenticação e não devolve segredos. Os uploads continuam passando por `POST /api/uploads`; a configuração armazena somente a URL final.

Arquivos internos de marca são servidos por `/brand` e persistidos preferencialmente como caminhos relativos, por exemplo `/brand/triade-fit-home.png`. Ao responder, a API converte `/brand` e `/uploads` para o protocolo/host da própria requisição. URLs antigas de uploads locais na porta `3333` também são rebaseadas para o host atual; isso evita que uma troca de IP da rede quebre as imagens no iPhone.

O juro configurado é percentual **total**, aplicado uma vez sobre o preço-base do cartão. A API calcula e devolve `interestCents`, `totalCents` e `installmentCents`; a interface mostra explicitamente esses valores antes do pagamento. O Asaas exige parcela mínima de R$ 5,00: `calculatePlan()` reduz automaticamente a quantidade efetiva de parcelas quando o total não suporta o máximo configurado. Com o valor inicial de R$ 12,00, o cartão aparece em 2x de R$ 6,00, embora o acesso continue válido por 12 meses.

### Variáveis e ativação

No arquivo `backend/.env`, preencha:

```env
PUBLIC_BASE_URL=https://api.seudominio.com
ASAAS_API_KEY='$aact_hmlg_COLE_A_CHAVE_COMPLETA_AQUI'
ASAAS_ENV=sandbox
ASAAS_WEBHOOK_TOKEN=um_token-forte-com-32-ou-mais-caracteres
```

Em `.env.production` usado pelo Docker Compose, mantenha a chave entre **aspas simples**. O `$` inicial faz parte da chave e, sem essa proteção, pode ser interpretado como variável e chegar truncado ao container. Sandbox usa prefixo `$aact_hmlg_`; produção usa `$aact_prod_`, sempre junto de `ASAAS_ENV` correspondente.

- use `sandbox` enquanto testa e `production` somente com a chave de produção;
- `PUBLIC_BASE_URL` precisa ser uma URL pública em HTTPS na produção; `localhost` e IP da rede local não são acessíveis pelo Asaas para o Webhook;
- no painel Asaas, cadastre `https://api.seudominio.com/api/billing/asaas/webhook`, informe o mesmo token e selecione pelo menos `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_DELETED` e `PAYMENT_REFUNDED`;
- não exponha `ASAAS_API_KEY` no app Expo, no admin ou no Git;
- aplique a migration antes de testar: `npm --workspace backend run prisma:deploy`.

O endpoint legado de Checkout hospedado continua disponível por compatibilidade, mas o mobile usa Pix e cartão internos. A fonte de verdade é o estado consultado no Asaas pela sincronização manual e, em produção, também pelo Webhook autenticado.

Erros conhecidos do gateway são `AppError` operacionais e podem ser mostrados ao cliente sem dados sensíveis: ambiente incompatível, chave recusada, campo inválido, limite de requisições ou indisponibilidade. Exceções inesperadas continuam retornando apenas “Erro interno do servidor”. O backend nunca registra o corpo enviado ao endpoint de cartão.

## 23. Preparação para produção

Antes do primeiro uso real:

1. trocar todas as credenciais seed e segredos JWT;
2. usar PostgreSQL gerenciado com TLS, backup e restauração testada;
3. hospedar API em HTTPS e restringir `CORS_ORIGINS`;
4. mover uploads para armazenamento de objetos privado, com URLs controladas;
5. configurar SMTP real e domínio de remetente;
6. decidir política de consentimento, acesso, retenção e exclusão de dados corporais/fotos;
7. mover refresh token mobile para SecureStore e revisar sessão web;
8. implementar observabilidade, logs estruturados e alertas;
9. criar CI para testes, build, migration e auditoria;
10. testar recovery, rotação de token, inativação, permissões e restauração de backup;
11. substituir URLs localhost dos dados seedados;
12. criar credenciais administrativas fora do seed destrutivo.

## 24. Publicação em VPS com containers

O modo de produção em VPS usa `docker-compose.production.yml`, separado do `docker-compose.yml` local. Ele cria três containers: `triade-fit-api` (Node/Express/Prisma), `triade-fit-postgres` (PostgreSQL 16) e `triade-fit-admin` (React/Vite entregue por Nginx interno). Os bots existentes continuam sob PM2 e não são gerenciados por esse Compose.

- `backend/Dockerfile` instala apenas o workspace do backend, gera o Prisma Client e, ao iniciar, executa `prisma migrate deploy`; `seed` nunca é executado automaticamente porque apaga dados demonstrativos e reais.
- `triade_fit_postgres` e `triade_fit_uploads` são volumes nomeados que preservam banco e arquivos locais entre reinícios. `docker compose down -v` remove esses volumes e não pode ser usado em produção.
- PostgreSQL não publica porta externa. A API publica apenas `127.0.0.1:${TRIADE_API_PORT}:3333`; Nginx/Caddy no host deve prover HTTPS e encaminhar para essa porta.
- O admin usa `127.0.0.1:${TRIADE_ADMIN_PORT}:80`; o Nginx do host entrega `https://admin.triade-fit.com`. `VITE_API_URL` é pública e é incorporada durante o build estático do painel.
- O backend continua na porta interna `3333`. Se o host já a utiliza, altere apenas `TRIADE_API_PORT` (por exemplo, `3340`) e ajuste o proxy; a URL pública permanece `https://api.triade-fit.com`.
- Os valores de produção ficam exclusivamente em `.env.production`, criado a partir de `.env.production.example` e ignorado pelo Git. Incluem `DATABASE_URL` com host `postgres`, segredos JWT, domínios CORS, `PUBLIC_BASE_URL`, SMTP e credenciais Asaas de produção.
- O app Android de produção deve receber `EXPO_PUBLIC_API_URL=https://api.triade-fit.com/api`; chaves do Asaas nunca entram no Expo nem no painel.
- Na primeira base vazia, `npm --workspace backend run admin:create` usa `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` para criar o administrador sem o comportamento destrutivo de `seed`.

O roteiro operacional e o exemplo Nginx estão em `docs/deploy-docker.md` e `deploy/nginx/triade-fit.conf.example`.

## 25. Glossário rápido

- **Access token**: JWT curto enviado em cada requisição autenticada.
- **Refresh token**: segredo longo usado para obter uma nova sessão sem senha.
- **Rotação**: revogar o refresh usado e entregar outro, reduzindo reutilização indevida.
- **Matrícula**: relação `StudentProgram` que libera um programa para uma aluna.
- **Progresso**: conclusão por aula; percentuais são calculados em tempo de leitura.
- **Soft delete/arquivamento**: registro permanece no banco, mas sai das telas ativas.
- **Seed**: carga de dados demonstrativos; neste projeto, é destrutiva.
- **Migration**: SQL versionado que leva o banco de um estado conhecido ao próximo.
- **Smoke test**: verificação curta dos fluxos integrados mais importantes.

## 26. Resumo para retomar trabalho rapidamente

Se você acabou de chegar ao projeto:

1. leia este arquivo;
2. leia somente o schema e os arquivos do domínio da tarefa;
3. veja `README.md` para o início rápido;
4. inicie PostgreSQL/API/clientes necessários;
5. confirme o comportamento atual antes de editar;
6. faça a menor mudança coerente entre banco, API e interface;
7. valide e atualize esta memória técnica.

Em uma frase: **o backend é a fonte das regras e permissões, o Prisma é a fonte do modelo persistido, e os dois clientes são experiências distintas sobre a mesma API**.

## 27. Catálogo simplificado: conteúdo da Home e programas de treino

Em 28 de agosto de 2026, o catálogo foi separado em duas experiências que não devem voltar a ser misturadas na interface:

1. **Conteúdo da Home:** módulo → aulas;
2. **Treinos:** programa de treino → aulas/exercícios.

O banco continua usando `Program → Module → Lesson` internamente para preservar matrículas, progresso, ordenação e dados existentes. Essa camada técnica não deve ser exposta ao admin nem à aluna quando não agrega valor:

- `Program.type = CONTENT`: o programa funciona como agrupador técnico. O painel esconde esse nível, lista os módulos diretamente e cria um agrupador automaticamente se ainda não existir;
- `Program.type = TRAINING`: o programa é visível na aba Treinos. O backend cria um módulo interno chamado `Aulas`, mas painel e mobile mostram as aulas diretamente dentro do programa;
- `Lesson.kind = CONTENT`: aula geral;
- `Lesson.kind = WORKOUT`: aula/exercício usada nos indicadores de treino;
- `Lesson.kind = MEDITATION`: aula que pode abrir a prática guiada e ter vídeo opcional conforme `showMeditationButton`;
- `Lesson.isIntroductory`: seleciona a aula para o carrossel superior da Home. Não há limite rígido; o painel recomenda cadastrar ao menos três e permite adicionar quantas forem necessárias.

### Contratos públicos atuais

| Método | Rota | Função |
| --- | --- | --- |
| `GET` | `/home-content` | devolve `{ introLessons, modules }` para a Home |
| `GET` | `/content-modules/:id` | devolve um módulo da Home, suas aulas, progresso e bloqueios |
| `GET` | `/training-programs` | lista somente programas `TRAINING`, com aulas já achatadas |
| `GET` | `/training-programs/:id` | detalhe do treino com `lessons`, sem módulo visual |

As rotas antigas `/programs`, `/programs/:id` e `/modules/:id` continuam existindo por compatibilidade, mas novas telas não devem usá-las para misturar os dois catálogos.

### Regras de sequência

- em conteúdo `CONTENT`, anterior/próxima e bloqueio sequencial são calculados somente dentro do módulo aberto;
- em treino `TRAINING`, a sequência considera todas as aulas do programa, mesmo que tecnicamente existam módulos internos;
- a conclusão continua registrada em `LessonProgress`, portanto a migração de interface não apaga nem reinicia progresso;
- a migration `202608280001_simplify_content_catalog` mantém programas existentes como `CONTENT` e marca as três primeiras aulas publicadas como introdutórias. Programas de treino novos devem ser cadastrados na aba específica do painel.

### Telas e painel

- Home: carrossel horizontal com todas as aulas introdutórias publicadas; abaixo, módulos com capa, nome, quantidade de aulas e progresso;
- detalhe do módulo: capa e aulas em carrossel horizontal no estilo de episódios;
- Treinos: lista apenas programas `TRAINING`; o detalhe lista aulas/exercícios diretamente;
- admin `/programas`: abas **Aulas introdutórias**, **Módulos da Home** e **Programas de treino**. A primeira funciona como uma vitrine gerenciável, com cadastro direto, escolha do módulo e suporte a três ou mais aulas. A segunda resume módulos e aulas, mantém as listas recolhidas para facilitar a leitura e oferece **Adicionar aula** no cabeçalho de cada módulo;
- capas, vídeo por URL/upload, meditação, materiais e atraso de liberação continuam disponíveis no formulário simplificado.

Ao alterar este domínio, preserve a distinção `CONTENT`/`TRAINING`, não remova o agrupamento interno sem uma migração completa de matrículas/progresso e valide os três projetos: testes do backend, build do admin e export do Expo.

### Liberação programada dos módulos da Home

Módulos `CONTENT` possuem `Module.unlockDelayDays`, configurável no admin em **Módulos da Home → editar módulo**:

- o primeiro módulo publicado fica disponível imediatamente;
- um módulo posterior exige todas as aulas publicadas do módulo anterior concluídas;
- `unlockDelayDays = 0` libera imediatamente depois da conclusão;
- um valor maior que zero calcula `unlocksAt` a partir da conclusão mais recente entre as aulas do módulo anterior;
- módulo já totalmente concluído não volta a ser bloqueado;
- a Home mostra cadeado, motivo ou data de liberação e não permite o toque enquanto bloqueado;
- `GET /content-modules/:id` e `GET /lessons/:id` também recusam o acesso com `403`, impedindo contornar a regra por link direto.

A função canônica é `withContentModulesAvailability` em `backend/src/services/progress.service.js`. Não replique esse cálculo apenas no mobile.

### Tipografia mobile

O mobile usa duas famílias carregadas localmente pelo Expo:

- **Oswald 500/600/700** para títulos editoriais, números, nomes de módulos e chamadas de destaque;
- **Inter 400/500/600/700/800** para corpo, metadados, formulários, botões e navegação.

Os nomes das fontes ficam centralizados em `mobile/src/theme/index.js` no objeto `fonts`. Todas as telas principais aplicam Oswald em títulos de página, títulos de cartão, nomes e números editoriais; Inter permanece em descrições, campos, metadados e textos longos para preservar legibilidade. Ao criar uma tela, use `fonts.display`/`fonts.displayBold` na hierarquia de destaque e `fonts.body` ou a família Inter no conteúdo. A barra inferior possui altura, line-height e deslocamento calculado com `useSafeAreaInsets`; não fixe rótulos junto à borda inferior.
