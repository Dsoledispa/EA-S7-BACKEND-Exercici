import path from 'node:path';
import swaggerJsdoc from 'swagger-jsdoc';
import j2s from 'joi-to-swagger';
import { Schemas } from '../middleware/Joi';
import { config } from './config';

// La documentación de cada endpoint está escrita en un comentario /** @openapi */
// encima de su ruta, en src/routes/. Aquí solo se montan las piezas comunes.

// Los esquemas del body salen de los mismos esquemas de Joi que validan las
// peticiones, así que no se pueden quedar desfasados.
const { swagger: authorInput } = j2s(Schemas.author.create);
const { swagger: bookInput } = j2s(Schemas.book.create);
const { swagger: registerInput } = j2s(Schemas.auth.register);
const { swagger: loginInput } = j2s(Schemas.auth.login);

// Lo que devuelve la API no es igual a lo que se envía: lleva el _id y las fechas que
// pone MongoDB, el usuario nunca devuelve la contraseña, y el libro trae sus autores enteros.
const storedFields = {
    _id: { type: 'string', example: '6ab3f2fe9c500204a7d5f80b' },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
};

const authorSchema = { type: 'object', properties: { ...storedFields, ...authorInput.properties } };

const { password: _password, ...userFields } = registerInput.properties;

const userSchema = {
    type: 'object',
    properties: { ...storedFields, ...userFields, role: { type: 'string', enum: ['user', 'admin'] } }
};

const bookSchema = {
    type: 'object',
    properties: {
        ...storedFields,
        ...bookInput.properties,
        authors: { type: 'array', items: authorSchema }
    }
};

// Ejemplos que se ven en la página de Swagger, sacados de los datos de npm run seed
const authorExample = {
    _id: '6ab3f2fe9c500204a7d5f801',
    name: 'Ursula K. Le Guin',
    email: 'leguin@example.com',
    birthDate: '1929-10-21T00:00:00.000Z',
    nationality: 'Estados Unidos',
    biography: 'Escritora de ciencia ficción y fantasía conocida por Terramar.',
    website: 'https://example.com/leguin',
    photoUrl: 'https://example.com/fotos/leguin.jpg',
    active: true,
    createdAt: '2026-09-23T10:00:00.000Z',
    updatedAt: '2026-09-23T10:00:00.000Z'
};

const bookExample = {
    _id: '6ab3f2fe9c500204a7d5f80b',
    title: 'A Wizard of Earthsea',
    authors: [authorExample],
    isbn: '9788400000008',
    edition: 1,
    publisher: 'Editorial Ejemplo',
    publishedYear: 1968,
    pages: 183,
    language: 'en',
    tags: ['fantasia'],
    price: 16,
    createdAt: '2026-09-23T10:00:00.000Z',
    updatedAt: '2026-09-23T10:00:00.000Z'
};

// Una respuesta correcta: el esquema de lo que se devuelve y un ejemplo con datos de verdad
const okResponse = (description: string, schema: object, example: object) => ({
    description,
    content: { 'application/json': { schema, example } }
});

// Una respuesta de error: siempre un message, con un ejemplo del mensaje real
const errorResponse = (description: string, message: string) => ({
    description,
    content: {
        'application/json': {
            schema: {
                type: 'object',
                properties: { message: { type: 'string' } }
            },
            example: { message }
        }
    }
});

const userExample = {
    _id: '6ab3f2fe9c500204a7d5f8a1',
    name: 'Admin',
    email: 'admin@example.com',
    role: 'admin',
    createdAt: '2026-10-05T10:00:00.000Z',
    updatedAt: '2026-10-05T10:00:00.000Z'
};

const swaggerPath = (filePath: string) => filePath.replace(/\\/g, '/');

const swaggerDocument = swaggerJsdoc({
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Library API',
            version: '1.0.0',
            description: 'API de autores y libros del Seminari 7 (Node.js, Express, TypeScript y MongoDB).'
        },
        servers: [{ url: `http://localhost:${config.server.port}` }],
        tags: [
            { name: 'Health', description: 'Comprobar que la API responde' },
            { name: 'Auth', description: 'Registro, login, renovación del token y logout' },
            { name: 'Users', description: 'Usuarios, para elegir con quién hablar en el chat' },
            { name: 'Authors', description: 'Autores' },
            { name: 'Books', description: 'Libros' }
        ],
        // Por defecto todas las rutas piden el token (el candado de Swagger).
        // Las rutas públicas lo quitan con security: [] en su comentario @openapi.
        security: [{ bearerAuth: [] }],
        components: {
            // Cómo se envía el token: en la cabecera Authorization: Bearer <token>.
            // En la página de Swagger se pega con el botón Authorize.
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
                // El refresh token va en una cookie HttpOnly que deja el login; la usan /auth/refresh y /auth/logout.
                // Desde la propia página de Swagger funciona sola, porque el navegador la envía.
                refreshCookie: { type: 'apiKey', in: 'cookie', name: 'refreshToken' }
            },
            schemas: {
                RegisterInput: registerInput,
                LoginInput: loginInput,
                User: userSchema,
                AuthorInput: authorInput,
                BookInput: bookInput,
                Author: authorSchema,
                Book: bookSchema
            },
            responses: {
                LoginOk: okResponse(
                    'Sesión iniciada: el access token y el usuario (el refresh token va en la cookie)',
                    {
                        type: 'object',
                        properties: {
                            token: { type: 'string' },
                            user: userSchema
                        }
                    },
                    { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', user: userExample }
                ),
                BadCredentials: errorResponse('El email o la contraseña no son correctos', 'Email o contraseña incorrectos'),
                Unauthorized: errorResponse('Falta el token, ha caducado o no es válido', 'El token ha caducado'),
                Forbidden: errorResponse('El usuario no tiene el rol necesario', 'Necesitas el rol admin'),
                AuthorOne: okResponse('Un autor', { type: 'object', properties: { author: authorSchema } }, { author: authorExample }),
                AuthorList: okResponse(
                    'Una página de autores y los datos de paginación',
                    {
                        type: 'object',
                        properties: {
                            authors: { type: 'array', items: authorSchema },
                            total: { type: 'integer', example: 12 },
                            page: { type: 'integer', example: 1 },
                            pages: { type: 'integer', example: 3 }
                        }
                    },
                    { authors: [authorExample], total: 12, page: 1, pages: 3 }
                ),
                BookOne: okResponse('Un libro, con los datos de sus autores', { type: 'object', properties: { book: bookSchema } }, { book: bookExample }),
                BookList: okResponse(
                    'Una página de libros y los datos de paginación',
                    {
                        type: 'object',
                        properties: {
                            books: { type: 'array', items: bookSchema },
                            total: { type: 'integer', example: 12 },
                            page: { type: 'integer', example: 1 },
                            pages: { type: 'integer', example: 3 }
                        }
                    },
                    { books: [bookExample], total: 12, page: 1, pages: 3 }
                ),
                BadRequest: errorResponse('El id de la URL no tiene forma de id de MongoDB', 'authorId no es un id válido'),
                InvalidPagination: errorResponse('Los parámetros de paginación o búsqueda no son válidos', '"page" must be greater than or equal to 1'),
                NotFound: errorResponse('No existe ningún recurso con ese id', 'not found'),
                Conflict: errorResponse('Ya existe otro recurso con ese email o ese ISBN', 'email ya existe'),
                Unprocessable: errorResponse('El body no cumple el esquema', '"email" is required'),
                ServerError: errorResponse('Error inesperado del servidor', 'Internal server error')
            }
        }
    },
    // __dirname es src/config con npm run dev y build/config con npm start:
    // en los dos casos se leen las rutas, porque al compilar se conservan los comentarios
    apis: [
        swaggerPath(path.join(__dirname, '../routes/*.ts')),
        swaggerPath(path.join(__dirname, '../routes/*.js')),
        swaggerPath(path.join(__dirname, '../server.ts')),
        swaggerPath(path.join(__dirname, '../server.js'))
    ]
});

export default swaggerDocument;
