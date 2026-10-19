# Seminari 7: backend con JWT y WebSockets

API REST con dos recursos, **autores** y **libros**, organizada en capas (rutas, middleware,
controllers, services y models). Es el backend del Seminario 7 de EA:

> Backend/Frontend: JWT, WebSockets. Backend TS + Express. Frontend Angular.

Este repositorio parte del backend del Seminario 6, que a su vez venía del Seminario 5. Del S6 trae
dos cambios respecto al S5: la descripción de los libros y el borrado lógico (ver
[Soft delete](#soft-delete)). Sobre esa base, el equipo añade en este seminario:

- Autenticación con JWT: registro, login, refresh (con el refresh token en una cookie HttpOnly), logout y rutas protegidas por rol
- Paginación en el servidor de los listados de autores y libros
- Extra: chat con WebSockets (socket.io) con los mensajes guardados en MongoDB

El frontend Angular que consume esta API está en
[EA-Seminari7-JWT-WebSockets-Frontend](https://github.com/Dsoledispa/EA-Seminari7-JWT-WebSockets-Frontend).

Las tareas y la bitácora del seminario están en [LOGS.md](LOGS.md); cómo trabajamos (ramas, commits,
pull requests), en [CONTRIBUTING.md](CONTRIBUTING.md).

## Stack tecnológico

Lo que ya está instalado y funcionando:

| Tecnología | Versión | Para qué se usa |
|---|---|---|
| [Node.js](https://nodejs.org/) | 24 LTS (mínimo 22.12) | Ejecuta JavaScript fuera del navegador: es el servidor |
| [TypeScript](https://www.typescriptlang.org/) | 6.0 | JavaScript con tipos. Se compila a JavaScript en `build/` |
| [Express](https://expressjs.com/) | 5.2 | Recibe las peticiones HTTP y las reparte por rutas y middleware |
| [MongoDB](https://www.mongodb.com/) | local o Atlas | Base de datos que guarda documentos |
| [Mongoose](https://mongoosejs.com/) | 9.10 | Define la forma de los datos (esquemas) y habla con MongoDB |
| [Joi](https://joi.dev/) | 18.2 | Comprueba que el body de una petición es correcto |
| [dotenv](https://github.com/motdotla/dotenv) | 17.4 | Carga las variables del archivo `.env` en `process.env` |
| [chalk](https://github.com/chalk/chalk) | 4.1 | Pone colores a los mensajes de la consola |
| [cors](https://github.com/expressjs/cors) | 2.8 | Controla desde qué origen puede llamar un navegador a la API |
| [swagger-ui-express](https://github.com/scottie1984/swagger-ui-express) | 5.0 | Muestra la documentación de la API en `/api-docs` |
| [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc) | 6.3 | Construye esa documentación leyendo los comentarios `@openapi` de las rutas |
| [joi-to-swagger](https://github.com/Twipped/joi-to-swagger) | 6.2 | Convierte los esquemas de Joi en los esquemas de la documentación |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) | 9.0 | Firma y verifica los tokens JWT (`sign` y `verify`) |
| [socket.io](https://socket.io/) | 4.8 | Servidor de WebSockets del chat, enganchado al mismo servidor HTTP que Express |
| [tsx](https://tsx.is/) | 4.23 | Ejecuta TypeScript sin compilar y reinicia la API al guardar (`npm run dev`) |
| [Oxlint](https://oxc.rs/docs/guide/usage/linter) | 1.85 | Analiza el código de `src/` y detecta errores comunes |
| [Prettier](https://prettier.io/) | extensión de VS Code | Da formato al código al guardar (reglas en `.prettierrc`) |

Las contraseñas no necesitan librería: se cifran con `scrypt`, que viene con Node (`node:crypto`).

## Requisitos previos

- [Node.js](https://nodejs.org/) 24 LTS (mínimo 22.12). Incluye [npm](https://www.npmjs.com/).
  Si usas [nvm](https://github.com/nvm-sh/nvm), `nvm use` elige la versión indicada en `.nvmrc`.
- [MongoDB](https://www.mongodb.com/): una instancia local o un cluster en MongoDB Atlas.
- [VS Code](https://code.visualstudio.com/) con la extensión Prettier (recomendado).

TypeScript no hace falta instalarlo aparte: viene con las dependencias del proyecto.

## Clonar el proyecto

```
git clone https://github.com/Dsoledispa/EA-Seminari7-JWT-WebSockets-Backend
cd EA-Seminari7-JWT-WebSockets-Backend
```

## Instalar las dependencias

```
npm install
```

## Configurar las variables de entorno

Cada miembro del equipo tiene su propio `.env`, que **no se sube a git**. Se crea copiando la plantilla:

```
cp .env.example .env
```

| Variable | Qué es | Valor por defecto |
|---|---|---|
| `MONGO_URL` | Dirección de tu MongoDB | `mongodb://127.0.0.1:27017/seminari7` |
| `SERVER_PORT` | Puerto en el que escucha la API | `1337` |
| `CORS_ORIGIN` | Origen exacto del frontend (con cookies no vale `*`) | `http://localhost:4200` |
| `NODE_ENV` | Con `production`, la cookie del refresh token se marca `Secure` (solo HTTPS) | `development` |
| `JWT_SECRET` | Secreto con el que se firma el access token. **Obligatoria** | valor de clase en `.env.example` |
| `JWT_REFRESH_SECRET` | Secreto con el que se firma el refresh token; distinto del anterior. **Obligatoria** | valor de clase en `.env.example` |
| `JWT_EXPIRES_IN` | Cuánto dura el access token | `15m` (15 minutos) |
| `JWT_REFRESH_EXPIRES_IN` | Cuánto dura el refresh token | `7d` (7 días) |

Si falta `JWT_SECRET` o `JWT_REFRESH_SECRET`, la API no arranca y dice qué variable falta. Si ya tenías
un `.env` de antes de la autenticación, copia esas cuatro líneas de `.env.example`.

Cada seminario usa su propia base de datos (`seminari7`), así los datos del S5 o del S6 no se mezclan
con los de este. Con una base de datos nueva no hace falta `npm run migrate-indexes`: los índices ya
se crean bien desde el principio.

## Llenar la base de datos (la primera vez)

Si arrancas con la base de datos vacía, la API funciona pero no devuelve nada y no hay ningún usuario
con el que iniciar sesión. Para tener datos con los que probar, hay 2 usuarios, 12 autores y 12 libros
de ejemplo en `src/seed-data.ts`:

```
npm run seed
```

Este comando solo inserta los datos si la base de datos está vacía. Si ya tienes datos de pruebas
anteriores, o vienen de una versión antigua de los modelos, hay que borrarlos y volver a crearlos:

```
npm run seed -- --reset
```

Siempre trabaja sobre la base de datos de tu `.env`.

Los usuarios de ejemplo son:

| Email | Contraseña | Rol |
|---|---|---|
| `admin@example.com` | `seminari7` | `admin`: puede usar el backoffice (autores y libros) |
| `user@example.com` | `seminari7` | `user`: puede iniciar sesión, pero no gestionar autores ni libros |

Las contraseñas están escritas a la vista en `src/seed-data.ts`. Es un proyecto de clase: son públicas
a propósito, para que cualquiera que clone el repositorio pueda entrar con cualquier usuario. En la
base de datos sí se guardan cifradas, porque el modelo `User` las cifra antes de guardarlas.

Si tu base de datos es de antes del Seminario 7, sus autores todavía tienen guardados los campos
`password` y `role`, que ya no existen en el modelo. Quitar un campo del esquema no lo borra de los
documentos, y la contraseña cifrada saldría en `GET /authors`. Para quitarlos sin perder tus datos:

```
npm run migrate-authors
```

(`npm run seed -- --reset` también lo soluciona, porque rehace todos los datos.)

## Ejecutar

Mientras programas, arranca la API en modo desarrollo. Se reinicia sola cada vez que guardas un archivo:
```
npm run dev
```

Para comprobar que responde, abre http://localhost:1337/ping en el navegador. Debe devolver `{"hello":"world"}`.
La documentación de la API (Swagger) está en http://localhost:1337/api-docs.

Para ejecutar la versión compilada, como se haría en un servidor:
```
npm run build
npm start
```

`npm run build` compila de TypeScript a JavaScript en `build/`. Si cambias el código, vuelve a ejecutarlo antes de `npm start`.

Para analizar el código con Oxlint:
```
npm run lint
```

El linter analiza únicamente `src/`; la carpeta `build/` contiene archivos generados por TypeScript.
Para aplicar las correcciones automáticas disponibles:
```
npm run lint:fix
```

## Controllers y operaciones asíncronas

Las consultas a MongoDB son operaciones asíncronas: tardan un tiempo y devuelven una
`Promise`. En los controllers usamos `async/await` para esperar su resultado de forma clara.

La estructura recomendada es:

```ts
const handler = async (req: Request, res: Response) => {
  try {
    const result = await Service.method(req.body);
    res.status(200).json({ result });
  } catch (error) {
    res.status(500).json({ error });
  }
};
```

- `async` permite utilizar `await` dentro de la función.
- `await` espera a que termine la operación y guarda su resultado.
- `try` contiene la operación que puede fallar.
- `catch` devuelve un error `500` si la operación falla.

En este proyecto no devolvemos la respuesta con `return`. El controller la envía directamente
con `res.status(...).json(...)` o `res.status(...).send()`.

La forma anterior usaba cadenas de Promises:

```ts
return Service.method(req.body)
  .then((result) => res.status(200).json({ result }))
  .catch((error) => res.status(500).json({ error }));
```

Ambas formas esperan la misma operación, pero `async/await` facilita la lectura y el manejo de
errores. `return` sigue siendo útil cuando una función necesita devolver un valor o detener su
ejecución; simplemente no es necesario para enviar una respuesta de Express.

## Estructura del proyecto

```
src/
  server.ts        Punto de entrada: conecta con MongoDB, registra el middleware y las rutas, engancha el chat y arranca el servidor
  seed.ts          Script que llena la base de datos con los datos de ejemplo
  migrate-indexes.ts  Script de una sola vez: adapta los índices únicos al borrado lógico
  migrate-authors.ts  Script de una sola vez: quita password y role de los autores guardados antes del S7
  seed-data.ts     Los datos de ejemplo: usuarios, autores y libros
  config/          Lee las variables de entorno y las reúne en un objeto config
  library/         Utilidades compartidas
    Logging.ts       Mensajes de consola con fecha y color (info, warning, error)
  routes/          El mapa de URLs: qué petición va a qué controller
    Auth.ts, Author.ts, Book.ts, Users.ts
  middleware/      Lo que se ejecuta entre la ruta y el controller
    VerifyToken.ts   Comprueba el token de la cabecera Authorization y deja el usuario en req.user (401).
                     Aquí se amplía también el tipo Request de Express con req.user
    RequireRole.ts   Deja pasar solo a un rol concreto (403)
    SocketAuth.ts    Comprueba el token al conectar un socket del chat
    Joi.ts           Guardas: validan el body (422) y el id de la URL (400)
    Cors.ts          Cabeceras de CORS, configuradas con CORS_ORIGIN
    Logger.ts        Escribe en consola cada petición y su código de respuesta
    ErrorHandler.ts  Convierte cualquier error en su código: 400, 401, 404, 409, 422 o 500
  controllers/     Leen la petición (req), llaman al service y eligen la respuesta (res)
    Auth.ts, Author.ts, Book.ts, Users.ts
  services/        Leen y escriben en la base de datos a través de los models. No saben que existe HTTP
    AuthService.ts, AuthorService.ts, BookService.ts, UserService.ts
  models/          Esquemas de Mongoose y las interfaces de cada recurso
    User.ts          Usuario, y las interfaces de los tokens (payload) y de req.user
    Message.ts       Mensaje del chat, y las interfaces de los eventos de Socket.IO
    Author.ts, Book.ts
  sockets/         socket.io: el chat y los avisos del backoffice
    Chat.ts          Salas, historial y envío de mensajes
    Notifications.ts Eventos books:changed y authors:changed, que emiten los controllers
  utils/           Funciones pequeñas sin dependencias de Express
    password.ts      Cifra y comprueba contraseñas con scrypt
```

Una petición recorre las capas siempre en el mismo orden:

```
cliente -> server.ts (logger, JSON, CORS) -> routes/ -> middleware/ (token, rol y validación) -> controllers/ -> services/ -> models/ -> MongoDB
```

Cada capa hace una sola cosa. Por eso los `services/` y los `models/` no importan Express:
si un día se cambiara Express por otro framework, esas dos carpetas no habría que tocarlas.

## Autenticación

La API usa **JWT** (JSON Web Token). Un JWT es un texto con tres partes separadas por puntos:
cabecera, contenido (payload) y firma. El servidor firma el token con un secreto que solo él conoce
(`JWT_SECRET`), así que puede comprobar que un token lo ha creado él y que nadie lo ha modificado.
El contenido **no está cifrado**: cualquiera puede leerlo (por ejemplo en https://jwt.io). Por eso
solo lleva el id del usuario (`sub`), su rol (`role`) y cuándo caduca (`exp`), nunca la contraseña.

El recorrido completo:

1. `POST /auth/register` con `{ name, email, password }` crea el usuario (siempre con el rol `user`)
   y responde 201 **sin token**. El frontend lleva entonces a la página de login.
2. `POST /auth/login` con `{ email, password }` responde `{ token, user }`, o 401 si el email o la
   contraseña no son correctos (el mismo mensaje en los dos casos, para no revelar qué emails están
   registrados). El refresh token no va en el JSON: se deja en una **cookie HttpOnly** (ver más abajo).
3. En cada petición a una ruta protegida, el cliente envía el token en la cabecera:
   `Authorization: Bearer <token>`.
4. El middleware `VerifyToken` comprueba la firma y la caducidad, y deja el usuario en `req.user`.
   Si falta el token, ha caducado o no es válido, responde 401.
5. El middleware `RequireRole('admin')` comprueba el rol: si el usuario no es `admin`, responde 403.
6. El access token dura poco (15 minutos). Cuando caduca, el cliente llama a `POST /auth/refresh`
   sin body: el navegador adjunta la cookie y la API responde `{ token }`, un access token nuevo, sin
   volver a escribir la contraseña. El refresh token dura 7 días.
7. `POST /auth/logout` borra la cookie. A partir de ahí, `/auth/refresh` responde 401.

### Dónde va cada token

El access token se devuelve en el JSON y el frontend lo guarda **solo en memoria**. El refresh token
viaja en la cookie `refreshToken`, que pone el backend con `res.cookie` en el login:

| Atributo | Para qué |
|---|---|
| `HttpOnly` | JavaScript no puede leerla (`document.cookie` no la muestra). Un script inyectado por XSS no se la puede llevar |
| `SameSite=Strict` | El navegador no la envía en peticiones que provoca otra web (CSRF) |
| `Path=/auth` | Solo se envía a `/auth/refresh` y `/auth/logout`, que son las únicas rutas que la necesitan |
| `Max-Age` | Dura lo mismo que el refresh token (`JWT_REFRESH_EXPIRES_IN`) |
| `Secure` | Solo por HTTPS. Se activa con `NODE_ENV=production`; en clase va por `http://localhost` |

Para que el navegador envíe y acepte la cookie entre `localhost:4200` y `localhost:1337`, el frontend
llama a `/auth/*` con `withCredentials: true` y CORS responde con `credentials: true` y el origen
exacto de `CORS_ORIGIN` (con credenciales, `*` no está permitido). La cookie la lee `cookie-parser`,
que la deja en `req.cookies`.

401 y 403 no son lo mismo: 401 es "no sé quién eres" (no hay sesión válida) y 403 es "sé quién eres,
pero no tienes permiso".

Qué está protegido. Cada ruta lleva sus middlewares en su router (`src/routes/`), en este orden:
primero `VerifyToken`, después `RequireRole` si hace falta un rol, después la validación y por último
el controller. Por ejemplo:

```ts
router.delete('/:bookId', VerifyToken, RequireRole('admin'), ValidateId('bookId'), controller.deleteBook);
```

La autenticación va antes que la validación: a quien no tiene sesión se le responde 401, sin decirle
si su petición estaba bien formada.

| Rutas | Quién puede |
|---|---|
| `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` | Cualquiera (refresh necesita la cookie con un refresh token válido) |
| `/ping`, `/api-docs` | Cualquiera |
| `/users`, `/users/me` y el chat | Cualquier usuario con sesión |
| `/authors`, `/books` (todas sus operaciones) | Solo `admin` |

Decisiones y límites, porque es un proyecto de clase:

- El access token y el refresh token se firman con **secretos distintos**: un refresh token no sirve
  como access token, ni al revés.
- Los refresh tokens **no se guardan** en la base de datos. Es lo más sencillo, pero tiene un coste:
  el servidor no puede invalidar un refresh token antes de que caduque, y cerrar sesión consiste en
  borrar la cookie (`/auth/logout`) y que el frontend olvide el access token que tiene en memoria.
- Al renovar, el servidor vuelve a leer el usuario de la base de datos: si le han cambiado el rol, el
  token nuevo ya lleva el rol actual; si se ha borrado, responde 401.

Para probarlo con curl:

```
curl -c cookies.txt -X POST http://localhost:1337/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"seminari7"}'
curl http://localhost:1337/authors -H "Authorization: Bearer <el token de la respuesta anterior>"
curl -b cookies.txt -X POST http://localhost:1337/auth/refresh
```

`-c` guarda la cookie que deja el login y `-b` la envía en el refresh. Sin `-b`, el refresh responde 401.

## Chat (WebSockets)

Una petición HTTP siempre la empieza el cliente: pregunta y el servidor responde. En un chat, en
cambio, el servidor tiene que **avisar** al cliente cuando otro usuario escribe. Para eso se usa un
WebSocket: una conexión que se queda abierta y por la que los dos lados pueden enviar mensajes cuando
quieran. [socket.io](https://socket.io/) lo hace fácil y se engancha al mismo servidor HTTP que
Express, así que la API y el chat comparten el puerto 1337. El código está en `src/sockets/Chat.ts`.

Con socket.io todo son **eventos** con un nombre: un lado los envía con `emit` y el otro los recibe
con `on`.

| Evento | Quién lo envía | Datos | Qué pasa |
|---|---|---|---|
| `chat:join` | Cliente | `{ room }` | El servidor mete al cliente en la sala y le contesta con `chat:history` |
| `chat:history` | Servidor, solo a quien entra | Lista de mensajes | Los 50 últimos de la sala, del más antiguo al más nuevo |
| `chat:message` | Cliente | `{ room, text }` | El servidor lo guarda en MongoDB y lo reenvía a la sala |
| `chat:message` | Servidor, a toda la sala | Un mensaje | Le llega a todos los que están en la sala, también a quien lo escribió |
| `chat:error` | Servidor, a un cliente | `{ message }` | Algo no se ha podido hacer (sala no permitida, mensaje vacío...) |
| `users:online` | Servidor, a todos | Lista de ids | Quién tiene el chat abierto. Se envía cada vez que alguien entra o sale |
| `books:changed` | Servidor, a todos | `{ action, id, name, userId }` | Un admin ha creado, editado o borrado un libro (`action` es `created`, `updated` o `deleted`) |
| `authors:changed` | Servidor, a todos | `{ action, id, name, userId }` | Lo mismo con un autor |

Un mensaje del servidor tiene esta forma: `{ _id, room, user: { _id, name }, text, timestamp }`.

Los dos últimos eventos **no son chat**: son avisos del backoffice. Los emiten los controllers de
libros y autores después de responder la petición HTTP, a través de `src/sockets/Notifications.ts`,
con `io.emit` (a todos los conectados, no a una sala). El cliente solo escucha; el chat los enseña en
la franja "Avisos del backoffice".

El recorrido de un mensaje:

1. El cliente se conecta enviando su access token: `io('http://localhost:1337', { auth: { token } })`.
   El middleware `SocketAuth` lo comprueba; si no vale, rechaza la conexión con `Authentication error`.
2. El cliente emite `chat:join` con una sala. El servidor hace `socket.join(sala)` y le envía el
   historial.
3. El cliente emite `chat:message`. El servidor coge el autor del token (nunca del mensaje), lo guarda
   con el modelo `Message` y hace `io.to(sala).emit('chat:message', mensaje)`.

Hay tres niveles de chat, según el nombre de la sala:

| Sala | Nombre | Quién entra |
|---|---|---|
| General | `general` | Cualquier usuario con sesión |
| Grupo | `group:<nombre>`, por ejemplo `group:seminario-7` | Quien conozca el nombre |
| Directo | `direct:<idA>:<idB>`, con los dos ids ordenados | Solo esos dos usuarios |

Para saber quién está activo, el servidor lleva en memoria los usuarios con el chat abierto (cuenta sus sockets, por si
tienen varias pestañas) y avisa a todos con `users:online` cada vez que alguien entra o sale. No se guarda en MongoDB.

Los ids se ordenan para que los dos usuarios generen el mismo nombre de sala sin ponerse de acuerdo.
`GET /users` da la lista de usuarios (solo id y nombre) para elegir con quién hablar. El servidor
comprueba que quien entra en un chat directo es uno de los dos: si no, responde `chat:error`.

Un límite que conviene saber: el token solo se comprueba al conectar. Si caduca con el socket ya
abierto, el chat sigue funcionando hasta que se cierra la conexión; al volver a conectar hace falta un
token válido (el frontend lo renueva solo).

Los tipos de los eventos (`ClientToServerEvents` y `ServerToClientEvents`) están en
`src/models/Message.ts`: con ellos TypeScript avisa si se emite un evento que no existe o con datos
equivocados.

## Endpoints

Todas las rutas salvo `/auth/*` y `/ping` necesitan la cabecera `Authorization: Bearer <token>`, y las
de autores y libros, además, el rol `admin` (ver [Autenticación](#autenticación)). El chat no usa
estas rutas: va por WebSocket (ver [Chat](#chat-websockets)).

| Método | URL | Qué hace | Body |
|---|---|---|---|
| GET | `/ping` | Comprueba que la API está viva | |
| POST | `/auth/register` | Registra un usuario (rol `user`). No devuelve token | `{ "name": "...", "email": "...", "password": "..." }` |
| POST | `/auth/login` | Inicia sesión: devuelve `{ token, user }` y deja el refresh token en una cookie HttpOnly | `{ "email": "...", "password": "..." }` |
| POST | `/auth/refresh` | Devuelve un access token nuevo: `{ token }`. Lee el refresh token de la cookie | |
| POST | `/auth/logout` | Borra la cookie del refresh token (204) | |
| GET | `/users` | Lista los usuarios (`_id` y `name`) para el chat directo. Cualquier usuario con sesión | |
| GET | `/users/me` | Devuelve el usuario con sesión (`_id`, `name`, `email`, `role`). Lo saca de `req.user` | |
| POST | `/authors` | Crea un autor | `{ "name": "...", "email": "..." }` |
| GET | `/authors` | Lista los autores, paginados (`?page=&limit=&search=`) | |
| GET | `/authors/:authorId` | Devuelve un autor | |
| PUT | `/authors/:authorId` | Reemplaza los datos de un autor | `{ "name": "...", "email": "..." }` |
| DELETE | `/authors/:authorId` | Borra un autor (borrado lógico) | |
| POST | `/books` | Crea un libro | `{ "title": "...", "authors": ["<id de un autor>"], "isbn": "..." }` |
| GET | `/books` | Lista los libros, paginados (`?page=&limit=&search=`), con los datos de sus autores | |
| GET | `/books/:bookId` | Devuelve un libro, con los datos de sus autores | |
| PUT | `/books/:bookId` | Reemplaza los datos de un libro | `{ "title": "...", "authors": ["<id de un autor>"], "isbn": "..." }` |
| DELETE | `/books/:bookId` | Borra un libro (borrado lógico) | |

Un autor tiene además estos campos opcionales: `birthDate`, `nationality`, `biography`, `website`,
`photoUrl` y `active`. Desde el Seminario 7 un autor no tiene contraseña ni rol: es un dato del
backoffice, como un libro. Quien inicia sesión es un usuario (`User`), y su contraseña nunca se
devuelve en las respuestas.

Un libro tiene además: `edition`, `publisher`, `publishedYear`, `pages`, `language` (`es`, `ca` o `en`),
`tags` (`ciencia-ficcion`, `fantasia`, `novela`, `ensayo`, `poesia`, `historia`), `price` y `description`.
Un libro puede tener más de un autor, y necesita al menos uno.

Ejemplo con curl (también sirve Postman o Thunder Client):

```
curl -X POST http://localhost:1337/authors -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"name":"Ana","email":"ana@example.com"}'
```

Códigos de respuesta: 201 al crear, 200 al leer o modificar, 204 al borrar, 400 si el id de la URL
no tiene forma de id de MongoDB, 401 si falta el token o no es válido, 403 si el usuario no tiene el
rol necesario, 404 si el id no existe, 409 si el email o el ISBN ya existen, 422 si el body no es
válido y 500 si falla algo en el servidor.

## Soft delete

Borrar un autor o un libro con `DELETE` **no lo elimina de MongoDB**: lo marca como borrado
(`deleted: true`) y guarda la fecha en `deletedAt`. A partir de ese momento:

- `GET` del listado y `GET` por id ya no lo devuelven (404 en la búsqueda por id).
- `PUT` sobre un documento borrado devuelve 404: no se puede modificar.
- El email del autor y el ISBN del libro quedan libres, así que se pueden reutilizar en un documento
  nuevo.
- Un autor borrado **sigue apareciendo dentro de sus libros**: el documento sigue existiendo y el
  `populate('authors')` lo encuentra. Es intencionado: el libro conserva quién lo escribió.

Esto funciona porque los índices únicos de `Author.email` y `Book.isbn` son **parciales**:
`partialFilterExpression: { deleted: false }`. La unicidad solo se aplica a los documentos no borrados.

Mongoose **no** elimina el índice único antiguo de una base de datos que ya existía (solo crea
índices nuevos). Por eso, si trabajas sobre una base de datos creada antes de esta versión, ejecuta
una vez:

```
npm run migrate-indexes
```

El script borra los índices `email_1` e `isbn_1` antiguos y crea los parciales. Es idempotente: si ya
están bien, no hace nada. Puedes comprobarlo con `db.authors.getIndexes()` y `db.books.getIndexes()`
en `mongosh`.

## Documentación de la API

La documentación de cada endpoint se escribe en un comentario `/** @openapi */` justo encima de su
ruta, en `src/routes/`. Al arrancar, `swagger-jsdoc` lee esos comentarios y monta el documento que
se ve en http://localhost:1337/api-docs.

Los esquemas del body no se escriben a mano: `joi-to-swagger` los genera a partir de los mismos
esquemas de Joi que validan las peticiones, así que la documentación no puede quedarse desfasada
cuando se añade o se quita un campo.

Las piezas comunes (datos generales, esquemas, respuestas de error y el esquema de seguridad
`bearerAuth`) están en `src/config/swagger.ts`. En `src/routes/Auth.ts` la documentación va debajo
del código, para que el router se lea de un vistazo.

Para probar las rutas protegidas desde Swagger: ejecuta `POST /auth/login`, copia el `token` de la
respuesta, pulsa el botón **Authorize** de arriba a la derecha y pégalo (solo el token, sin la palabra
`Bearer`). A partir de ahí Swagger envía la cabecera en todas las peticiones. Las rutas con candado son
las que lo necesitan.

## Cómo contribuir

Ramas, commits y pull requests en [CONTRIBUTING.md](CONTRIBUTING.md). Tareas pendientes y bitácora en
[LOGS.md](LOGS.md).
