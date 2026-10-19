# LOGS

Bitácora del backend del Seminario 7. Tiene dos partes:

- **Tareas**: lo que hay que hacer en este repositorio, por bloques. Quien coge una tarea la marca al cerrarla.
- **Bitácora**: lo que se ha hecho, las decisiones tomadas y qué prompts de IA se han usado.

Las tareas del frontend están en el LOGS.md de [EA-Seminari7-JWT-WebSockets-Frontend](https://github.com/Dsoledispa/EA-Seminari7-JWT-WebSockets-Frontend).

## Contrato

Lo que backend y frontend tienen que cumplir igual. Si algo de aquí cambia, se cambia en los dos LOGS.md.

- **Rutas públicas**: `POST /auth/register` y `POST /auth/login`. `POST /auth/refresh` y `POST /auth/logout` se autentican con la cookie del refresh token. `GET /ping` y la documentación
  (`/api-docs`) también son públicas. Todo lo demás exige token.
- **Registro**: el cuerpo es `{ name, email, password }` (contraseña de 8 caracteres como mínimo; `role` no se acepta, todo usuario nuevo es `user`). Responde 201 con `{ user }` y **sin token**, 409
  si el email ya existe o 422 si el cuerpo no es válido. El frontend redirige entonces a la página de login.
- **Login**: el cuerpo es `{ email, password }`. Responde `{ token, user }` o 401. `user` es `{ _id, name, email, role, createdAt, updatedAt }`, sin contraseña. El refresh token **no va en el
  JSON**: se deja en la cookie `refreshToken` (HttpOnly, SameSite=Strict, Path=/auth, Max-Age de 7 días; Secure en producción).
- **Refresh**: sin cuerpo. Lee el refresh token de la cookie y responde `{ token }` (un access token nuevo), o 401 si no hay cookie, ha caducado o no es válida. El refresh token no cambia.
- **Logout**: sin cuerpo. Borra la cookie y responde 204. Después, `/auth/refresh` responde 401.
- **Cookies y CORS**: el frontend llama a `/auth/*` con `withCredentials: true`; el backend responde con `Access-Control-Allow-Credentials: true` y el origen exacto de `CORS_ORIGIN` (no vale `*`).
- **Token**: se envía en la cabecera `Authorization: Bearer <token>`. Su payload lleva los claims `sub` (id del usuario), `role` y `exp`. El access token dura 15 minutos y el refresh token 7 días.
  El frontend guarda el access token solo en memoria (una signal), nunca en `localStorage` ni `sessionStorage`; al recargar la página lo recupera llamando a `/auth/refresh` y después a `/users/me`.
- **Errores de autenticación**: 401 si falta el token, ha caducado (`{ message: 'El token ha caducado' }`) o no es válido (`{ message: 'Token no válido' }`); 403 si hay sesión pero no el rol
  necesario.
- **Roles**: el CRUD del backoffice (autores y libros) es solo para `admin`. El chat es para todos los usuarios con sesión iniciada.
- **Modelos**: `users`, `authors` y `books`. La autenticación vive solo en `User` (`name`, `email`, `password`, `role`): los campos `password` y `role` que `Author` traía del Seminario 5 se
  eliminan, y enviarlos al crear o editar un autor da 422.
- **Paginación y búsqueda**: `GET /authors?page=&limit=&search=` y `GET /books?page=&limit=&search=`, por defecto `page=1` y `limit=5` (máximo 100). `search` es opcional y busca parcialmente sin
  distinguir mayúsculas: autores por nombre/email y libros por título/ISBN/descripción. Responden `{ authors, total, page, pages }` y `{ books, total, page, pages }` con metadatos calculados sobre los
  resultados filtrados.
- **Autores borrados**: un autor borrado (borrado lógico) sigue apareciendo dentro de sus libros.
- **Chat** (extra):
  - Conexión: `io(url, { auth: { token } })` con el access token. Si falta, es falso o ha caducado, el servidor rechaza la conexión y el cliente recibe `connect_error` con el mensaje
    `Authentication error`.
  - Salas: `general`, `group:<nombre>` y `direct:<idA>:<idB>` (los dos ids ordenados; solo entran esos dos usuarios). Cualquier otro nombre se rechaza con `chat:error`.
  - Del cliente al servidor: `chat:join` con `{ room }` y `chat:message` con `{ room, text }` (de 1 a 2000 caracteres; hay que haber entrado antes en la sala).
  - Del servidor al cliente: `chat:history` (solo a quien entra: los 50 últimos mensajes de la sala, del más antiguo al más nuevo), `chat:message` (a toda la sala, también a quien lo
    escribió), `chat:error` con `{ message }` y `users:online` (a todos, cada vez que alguien abre o cierra el chat: la lista de ids de los usuarios conectados).
  - Un mensaje es `{ _id, room, user: { _id, name }, text, timestamp }`.
  - `GET /users` (con sesión, cualquier rol) responde `{ users: [{ _id, name }] }`, ordenados por nombre, para elegir con quién hablar en el chat directo.
- **Avisos del backoffice** (socket.io, no son chat): cuando un admin crea, edita o borra un libro o un autor, el servidor emite a todos los conectados `books:changed` o `authors:changed` con
  `{ action: 'created' | 'updated' | 'deleted', id, name, userId }` (`name` es el título del libro o el nombre del autor; `userId`, quién lo ha hecho). El cliente no envía nada: solo escucha.
- **Usuario con sesión**: `GET /users/me` (con sesión, cualquier rol) responde `{ user: { _id, name, email, role } }`, a partir del token (`req.user`).

## Tareas

### Estructura

- [x] `structure`: ramas `develop` y de objetivo, identidad del repositorio (nombre, README con el stack tecnológico, base de datos `seminari7`), CONTRIBUTING.md, este LOGS.md y linter

### Bloque A: autenticación JWT con el modelo `User`

- [x] Modelo `User` nuevo: nombre, email único, contraseña cifrada con el mismo hook de scrypt que ya tiene `Author`, `select: false` y `toJSON` sin contraseña, rol `user` o `admin`
- [x] Quitar de `Author` los campos `password` y `role` (sus hooks se mudan a `User`) y ajustar el seed, la validación de Joi y Swagger
- [x] `POST /auth/register` (pública): nombre, email y contraseña, validación con Joi, 409 si el email ya existe; responde 201 con el usuario y sin token
- [x] `POST /auth/login` (pública): comprueba la contraseña contra el hash (formato `scrypt:sal:clave`; ojo, `password` tiene `select: false` y hay que pedirla en la consulta) y devuelve
      `{ token, refreshToken, user }` o 401
- [x] `POST /auth/refresh`: con register, login y refresh, el router de auth queda en cuatro líneas
- [x] Servicio de auth: firmar el access token de vida corta (claims `sub`, `role`, `exp`) y el refresh token; `JWT_SECRET` y los tiempos de expiración en el `.env` y en el `.env.example`
- [x] Middleware `VerifyToken` en `middleware/`: saca el token de `Authorization: Bearer`, lo verifica y deja el usuario en `req.user`; `TokenExpiredError` y `JsonWebTokenError` se responden con 401
      desde el gestor de errores
- [x] Middleware de roles: 401 si no hay sesión, 403 si hay sesión pero no el rol necesario
- [x] Tipos: interfaz del payload del JWT y extensión del tipo `Request` de Express para `req.user`
- [x] Proteger las rutas según el contrato: todo salvo register y login, y el CRUD solo para `admin`
- [x] Seed: usuarios de ejemplo, al menos un `admin`, para la demo y las pruebas
- [x] Swagger: esquema `bearerAuth`, candado en las rutas protegidas y documentación de `/auth`

### Bloque B: WebSockets con mensajes guardados (extra)

Extra: el profesor lo marcó como no prioritario y seguramente no entra en la demo. Se mantiene simple: lo importante es poder explicar el flujo de un mensaje, desde que un usuario lo escribe hasta que
el servidor lo emite a los demás.

- [x] Enganchar socket.io al `http.createServer(app)` que ya existe en `server.ts`
- [x] Middleware de socket.io que valida el JWT del handshake (`auth: { token }`) antes de aceptar la conexión
- [x] Chat a tres niveles con salas (rooms): sala general, salas de grupo y chat directo entre dos usuarios
- [x] Eventos `connection`, `disconnect`, `chat:join` y `chat:message` (emisión a la sala), con los tipos de los eventos de cliente a servidor y de servidor a cliente
- [x] Endpoint para listar usuarios, necesario para elegir con quién hablar en el chat directo
- [x] Modelo `Message` en MongoDB (sala, usuario, texto, fecha): cada mensaje se guarda al recibirlo
- [x] Historial: al entrar en una sala, el servidor envía los últimos mensajes guardados
- [x] CORS del servidor de sockets y logger de conexiones, desconexiones y fallos de autenticación

### Bloque C: paginación en el servidor

- [x] `GET /authors` y `GET /books` con `?page=&limit=` (por defecto 1 y 5): `skip` y `limit` más `countDocuments`, y la respuesta con `total`, `page` y `pages`
- [x] Validar `page` y `limit` con Joi
- [x] Actualizar Swagger y, si hace falta más volumen para probar, ampliar el seed

### Ejercicio del seminario 7: tokens seguros y más eventos de socket

- [x] Refresh token en una cookie HttpOnly, SameSite=Strict, Path=/auth, con la misma duración que el token y Secure en producción; fuera del JSON del login
- [x] `POST /auth/refresh` lee la cookie (401 sin cookie o con una no válida) y `POST /auth/logout` la borra
- [x] CORS con `credentials: true` y el origen exacto del frontend
- [x] Eventos de socket.io que no son chat: `books:changed` y `authors:changed`

### Extra opcional

- [ ] Que el rol `user` pueda ver la lista de libros (solo lectura), para que tenga algo más que el chat. Va después del bloque A y necesita su pareja en el frontend

## Bitácora

### 2026-10-03 · Punto de partida y `structure`

- El repositorio nace como copia del backend del Seminario 6 (que venía del S5). Del S6 trae la descripción de los libros y el borrado lógico (`deleted` y `deletedAt`, con índices únicos parciales
  para el email y el ISBN).
- Se crea `develop` como rama de integración; `main` queda para presentar.
- Identidad: el paquete pasa a llamarse `ea-seminari7-jwt-websockets-backend`, el README se pone al día con el stack tecnológico y la base de datos por defecto pasa a ser `seminari7`.
- El `.gitignore` heredado ignoraba todos los `.md` salvo el README (reglas de notas personales), y por eso se habían perdido CONTRIBUTING.md, EXERCISE.md y LOG.md. Se quita esa regla; CONTRIBUTING.md
  se recupera del S5 y la bitácora pasa a ser este LOGS.md.
- Linter: Oxlint (heredado del S5) pasa sin avisos con la configuración del proyecto (`.oxlintrc.json`). Por curiosidad se probó con las categorías `suspicious` y `pedantic`: salen 8 sugerencias de
  estilo (comentarios en línea, clase con solo métodos estáticos en `Logging.ts`, funciones largas, `async` sin `await`...) y ningún fallo. En el frontend se prueba angular-eslint para comparar las
  dos herramientas.

### 2026-10-04 · Paginación en el servidor (Bloque C)

- Se implementa la paginación de `GET /authors` y `GET /books`, con `page=1` y `limit=5` por defecto. Joi valida enteros, `page >= 1` y `1 <= limit <= 100`; los valores convertidos se guardan en
  `res.locals.query` y los inválidos responden 400.
- Las consultas usan `skip`, `limit` y orden estable por `_id`; `countDocuments` comparte el filtro `{ deleted: false }`. La respuesta incluye la lista correspondiente, `total`, `page` y `pages`. El
  `populate('authors')` de libros no filtra autores borrados lógicamente.
- Swagger documenta los parámetros, las respuestas paginadas y el error 400. El seed contiene 12 autores y 12 libros.
- Decisiones: mantener fuera del listado y del total los documentos borrados lógicamente; conservar los autores borrados en los libros relacionados.
- Validación ejecutada: `npm run build`, `npx oxlint` y comprobaciones de Joi, Swagger generado y cantidades/referencias del seed. No hay pruebas automatizadas ni script `test` en el paquete.

### 2026-10-04 · Búsqueda de autores y libros

- `GET /authors` admite `search` sobre nombre/email y `GET /books` sobre título/ISBN/descripción. La búsqueda literal, sin distinguir mayúsculas, se aplica antes de contar y paginar; Joi limita el
  término a 100 caracteres y Swagger documenta el parámetro.
- Validación ejecutada: `npm run build` y `npm run lint`.

### 2026-10-05 · Autenticación JWT (Bloque A)

- Nuevo modelo `User` (`name`, `email` único, `password`, `role` `user`/`admin`). La contraseña se cifra con scrypt en el hook `pre('save')`, tiene `select: false` y el `toJSON` la quita. El
  cifrado y la comprobación salen del modelo a `utils/password.ts` (`hashPassword` y `verifyPassword`); la comprobación usa `timingSafeEqual`.
- `Author` pierde `password`, `role`, el hook de cifrado y el log del email de bienvenida (pasa a `User`). Joi rechaza esos campos al crear o editar un autor, y el seed y Swagger se ajustan.
- Rutas `POST /auth/register`, `/auth/login` y `/auth/refresh`. El router de auth son cuatro líneas (las tres rutas y el `export`); su documentación de Swagger va debajo del código.
- Tokens con `jsonwebtoken` 9: access token de 15 minutos con `sub` y `role`, y refresh token de 7 días solo con `sub`. Se firman con **secretos distintos** (`JWT_SECRET` y `JWT_REFRESH_SECRET`)
  para que uno no sirva por el otro. Si falta un secreto, el servidor no arranca y dice cuál. Las cuatro variables nuevas están en `.env.example` y en el README.
- Middlewares `VerifyToken` (401) y `RequireRole` (403) en `middleware/`, aplicados en `server.ts`: `/authors` y `/books` son solo para `admin`. El `ErrorHandler` responde 401 a
  `TokenExpiredError` ("El token ha caducado") y al resto de `JsonWebTokenError` ("Token no válido"), con mensajes distintos para que el frontend sepa cuándo renovar.
- Tipos en `types/`: el payload de cada token y `req.user`, añadido al `Request` de Express.
- Seed: `admin@example.com` (admin) y `user@example.com` (user), los dos con la contraseña `seminari7`. El `--reset` borra también los usuarios.
- Swagger: esquema `bearerAuth` con seguridad global (candado en todas las rutas), `security: []` en `/auth/*` y `/ping`, y respuestas 401 y 403 en las rutas protegidas.
- Decisiones:
  - El registro no acepta `role`: los `admin` solo salen del seed, para que nadie pueda registrarse como administrador.
  - El login responde 401 con el mismo mensaje si el email no existe o si la contraseña está mal, para no revelar qué emails están registrados.
  - El refresh token va en el body y no se guarda en la base de datos: es lo más sencillo, a cambio de que no se pueda invalidar antes de que caduque (el logout es solo del cliente). Al
    renovar se relee el usuario, así que el token nuevo lleva su rol actual.
  - Cambios de contrato: `name` en el registro; el login añade `refreshToken`; se concreta el cuerpo y la respuesta de refresh y los mensajes de 401. Copiado al LOGS.md del frontend.
- Problema encontrado: al quitar `password` del esquema de `Author`, los autores que ya estaban en la base de datos devolvían su contraseña cifrada en `GET /authors` (el `select: false` ya no
  se aplica a un campo que el esquema no conoce). Se añade `npm run migrate-authors`, que quita `password` y `role` de los autores guardados sin borrar nada; `npm run seed -- --reset`
  también lo soluciona. **Quien se traiga estos cambios con una base de datos anterior tiene que ejecutar uno de los dos.**
- Aviso para el frontend: hasta que esté el bloque D, el frontend recibe 401 en todas las peticiones (no tiene login) y 422 al guardar un autor (sigue enviando `password` y `role`).
- Validación ejecutada: `npm run build` y `npm run lint` sin errores. Con la API arrancada contra MongoDB, 39 pruebas con curl, todas correctas: registro (201 sin token, 409 con email
  repetido aunque cambien las mayúsculas, 422 con `role`, sin nombre o con contraseña corta), login (200 con los dos tokens y sin contraseña; 401 igual con email inexistente o contraseña
  mala), 401 sin token, sin `Bearer`, con token mal formado, con firma falsa, con un refresh token en lugar del access y con un token caducado (instancia con `JWT_EXPIRES_IN=2s`), 403 como
  `user` en autores y libros, 200 como `admin` con la paginación y la búsqueda intactas y sin `password` ni `role` en los autores, 422 al crear un autor con `password`, refresh correcto
  (también tras caducar el access) y 401 si se le pasa un access token. Se comprueba también el documento de Swagger generado y que la API no arranca sin `JWT_SECRET`.

### 2026-10-05 · Chat con WebSockets (Bloque B)

- socket.io 4.8 enganchado al mismo `http.createServer` que Express: la API y el chat comparten el puerto.
- Middleware `SocketAuth` (`VerifySocketToken`): valida el access token del handshake (`auth: { token }`) y guarda el id del usuario en `socket.data.user`; si no vale, rechaza la conexión con
  `Authentication error` y lo apunta en el log.
- Eventos `chat:join` (entra en la sala y devuelve el historial), `chat:message` (guarda y reenvía a la sala), `chat:history`, `chat:error` y `disconnect`, con los datos de la red comprobados a
  mano porque los tipos de TypeScript no validan lo que llega por el socket. El autor de cada mensaje sale del token, nunca de lo que envía el cliente.
- Modelo `Message` (sala, usuario, texto, fecha). El historial son los 50 últimos mensajes, con el nombre del autor (`populate`).
- `GET /users` (con sesión, cualquier rol) con el id y el nombre de los usuarios, para el chat directo.
- Revisión antes de presentar:
  - **Fallo de privacidad corregido**: cualquier usuario con sesión podía hacer `chat:join` en el chat directo de otros dos (los ids salen en `GET /users`), leer su historial y escribir en
    él. Ahora `canJoinRoom` solo acepta los nombres del contrato y, en `direct:<idA>:<idB>`, que los ids estén ordenados y que uno sea el del usuario. Como `chat:message` exige haber
    entrado en la sala, tampoco se puede escribir.
  - La lógica del chat sale de `server.ts` a `sockets/Chat.ts` (`StartChat`), que explica en un comentario el recorrido de un mensaje. Los eventos quedan tipados (`ClientToServerEvents`,
    `ServerToClientEvents` y `SocketData` en `types/chat.ts`), como pedía la tarea.
  - Límite de 2000 caracteres por mensaje (`chat:error` y `maxlength` en el modelo), el mismo que el campo del frontend.
  - Swagger documenta `GET /users`. El README explica el chat (eventos, salas, recorrido de un mensaje) y el Contrato queda concretado en los dos LOGS.md.
  - Límite que se deja así y se documenta: el token solo se comprueba al conectar; un socket abierto sigue funcionando aunque el token caduque.
- Validación ejecutada: `npm run build` y `npm run lint` sin errores. Con la API arrancada contra una base de datos de prueba y tokens de 20 segundos, 29 pruebas con `socket.io-client` desde
  Node, todas correctas: `GET /users` (401 sin token; con sesión, solo `_id` y `name`), conexión rechazada sin token, con token falso, con refresh token y con token caducado; mensajes en
  la sala general, de grupo y directa que solo reciben los de la sala; historial guardado y en orden; autor sacado del token; `chat:error` sin haber entrado, con texto vacío o de más de
  2000 caracteres, con una sala fuera del contrato, con los ids de un directo sin ordenar y al intentar entrar o escribir en un directo ajeno. Antes de la corrección, esas dos últimas
  daban acceso al historial privado. Además, el chat probado en el navegador con dos usuarios a la vez (ver la bitácora del frontend).

### 2026-10-05 · Usuarios conectados en el chat

- Recomendación de los profesores: ver quién está activo. El servidor apunta en memoria los usuarios con el chat abierto (`Map` de id de usuario → número de sockets, para que
  cerrar una de dos pestañas no lo desconecte) y emite a todos `users:online` con la lista de ids cada vez que alguien entra o sale. No se guarda en MongoDB: si el servidor se
  reinicia, la lista se rehace con las reconexiones. "Conectado" significa "con el chat abierto", porque el socket solo vive en la página del chat.
- Evento añadido a `ServerToClientEvents`, al Contrato de los dos LOGS.md y a la tabla de eventos del README.
- Validación ejecutada: `npm run build` y `npm run lint` sin errores; prueba en el navegador con dos usuarios descrita en la bitácora del frontend.

### 2026-10-10 · Rutas protegidas en cada router, interfaces en models/ y GET /users/me

Revisión de un profesor sobre el código del backend:

- No encontraba las rutas protegidas con `VerifyToken`: estaban aplicadas en `server.ts` (`router.use('/books', VerifyToken, RequireRole('admin'), bookRoutes)`) y no en los ficheros
  de `routes/`. Por el mismo motivo parecía que `RequireRole` no se usaba. Ahora cada ruta lleva su cadena en su router, en el orden `VerifyToken` → `RequireRole('admin')` →
  validación → controller, y `server.ts` solo monta los routers. Es lo que explicamos en el Seminari 5 (el router encadena las guardas) y lo que espera quien lee ruta a ruta.
- La carpeta `types/` desaparece: las interfaces de los tokens y de `req.user` pasan a `models/User.ts`; las de los eventos del chat, a `models/Message.ts`; y la ampliación del
  tipo `Request` de Express, a `middleware/VerifyToken.ts`, que es donde se rellena `req.user`.
- `req.user` no se usaba en ningún controller. Se añade `GET /users/me`, que devuelve el usuario con sesión a partir de `req.user`.
- `controllers/Users.ts` consultaba el modelo directamente. Se crea `services/UserService.ts` (con las interfaces `IUserSummary` e `IUserProfile` para lo que devuelve), y el
  controller pasa a llamar al service, como en autores y libros.
- El comportamiento de la API no cambia. Validación: `npm run build` y `npm run lint` sin errores; 35 pruebas con curl (las diez rutas de autores y libros dan 401 sin token y 403
  como `user`; como `admin`, 200, y la validación se ejecuta después de la autenticación; `/users` y `/users/me` con y sin token, y `/users/me` devuelve el usuario de cada token)
  y 6 pruebas del chat con `socket.io-client` (autenticación, `users:online`, mensajes y directo ajeno bloqueado).

### 2026-10-19 · Ejercicio del seminario 7: refresh token en cookie HttpOnly y avisos por socket

- Problema de partida: el login devolvía los dos tokens en el JSON y el frontend los guardaba en `localStorage`. Cualquier script inyectado en la página (XSS) podía leerlos, incluido el
  refresh token, que sirve para conseguir access tokens nuevos durante 7 días.
- Ahora `POST /auth/login` responde `{ token, user }` y deja el refresh token en la cookie `refreshToken` con `httpOnly`, `sameSite: 'strict'`, `path: '/auth'`, `maxAge` igual a
  `JWT_REFRESH_EXPIRES_IN` (convertido a milisegundos con la librería `ms`, la misma que usa jsonwebtoken) y `secure` solo cuando `NODE_ENV=production`. Las opciones están en una sola
  función del controller, `refreshCookieOptions()`, para que login y logout usen exactamente las mismas: si `path` no coincide, el navegador no borra la cookie.
- `POST /auth/refresh` ya no valida body con Joi: lee `req.cookies.refreshToken` (middleware `cookie-parser`). Sin cookie responde 401 "Falta el refresh token"; con una cookie caducada o
  falsa, `jwt.verify` lanza y el `ErrorHandler` responde 401 como antes. `POST /auth/logout` (nueva) hace `clearCookie` y responde 204.
- CORS: `credentials: true` y `CORS_ORIGIN` pasa a ser por defecto `http://localhost:4200`; con credenciales el navegador no acepta `*`. Variable nueva `NODE_ENV` en `.env.example`.
- `AuthService` no cambia: sigue firmando los dos tokens; es el controller quien decide que uno va en el JSON y el otro en la cookie.
- Swagger: desaparece `RefreshInput`, se añade el esquema de seguridad `refreshCookie` (cookie) para refresh y logout, y la respuesta del login ya no lleva `refreshToken`.
- Eventos de socket.io que no son chat (`sockets/Notifications.ts`): los controllers de libros y autores, después de responder, llaman a `notifyBooksChanged` o `notifyAuthorsChanged`,
  que hacen `io.emit('books:changed' | 'authors:changed', { action, id, name, userId })` a todos los conectados. `StartNotifications(io)` recibe el servidor que crea `StartChat`.
  Tipos añadidos a `ServerToClientEvents` (`BackofficeChange`).
- Validación ejecutada: `npm run build` y `npm run lint` sin errores. Con la API arrancada contra MongoDB, pruebas con curl: el login responde `Set-Cookie: refreshToken=...; Max-Age=604800;
  Path=/auth; HttpOnly; SameSite=Strict` y `Access-Control-Allow-Credentials: true`, y el JSON solo trae `token` y `user`; refresh con cookie 200; sin cookie, con cookie falsa o con el token en
  el body 401; logout 204 con la cookie vaciada y refresh después 401; el preflight CORS desde otro origen no devuelve ese origen. Con `socket.io-client` desde Node, un `user` conectado recibe
  `books:changed` al crear y borrar un libro y `authors:changed` al editar un autor. La prueba en navegador está en la bitácora del frontend.
- Prompt de IA usado: «Resolver el ejercicio del seminario 7 (PDF): refresh token en cookie HttpOnly y SameSite=Strict solo para /auth, access token solo en memoria, CORS con credenciales,
  y añadir eventos de socket.io que no sean de chat. Hacerlo sencillo, al estilo del resto del proyecto».
