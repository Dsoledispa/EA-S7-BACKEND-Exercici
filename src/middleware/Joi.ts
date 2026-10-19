import Joi, { ObjectSchema } from 'joi';

import { NextFunction, Request, Response } from 'express';

import { IAuthor } from '../models/Author';
import { BOOK_LANGUAGES, BOOK_TAGS, IBook } from '../models/Book';
import { IUser } from '../models/User';

export interface PaginationQuery {
    page: number;
    limit: number;
    search: string;
}

// Funcion que se encarga de validar los datos que llegan en una petición
// Recibe un esquema de Joi y comprueba que el body cumple sus condiciones
export const ValidateJoi = (schema: ObjectSchema) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Comprobamos que los datos del body cumplen el esquema
            await schema.validateAsync(req.body);

            // Si la validacion es correcta continuamos con la siguiente funcion
            next();
        } catch (error) {
            // Si los datos no son validos pasamos el error al siguiente middleware
            next(error);
        }
    };
};

// Un id de MongoDB tiene 24 caracteres hexadecimales
// Esta expresion nos sirve para comprobar que tiene el formato correcto
const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

// Funcion que comprueba el id que llega en los parametros de la URL
// Si no tiene el formato de un id de MongoDB devolvemos un error 400
export const ValidateId = (paramName: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        // Cogemos el parametro de la URL usando el nombre que hemos recibido
        const id = req.params[paramName];

        // Comprobamos que existe y que tiene el formato correcto
        if (typeof id !== 'string' || !OBJECT_ID.test(id)) {
            // Si no es valido devolvemos un error de peticion incorrecta
            return res.status(400).json({ message: `${paramName} no es un id válido` });
        }

        // Si el id es correcto continuamos con la siguiente funcion
        next();
    };
};

// Aqui tenemos todos los esquemas de validacion que utilizamos en la aplicacion
export const Schemas = {
    // Validacion de los parametros de paginacion
    pagination: Joi.object<PaginationQuery>({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(5),
        search: Joi.string().trim().max(100).allow('').default('')
    }),

    // Validaciones de las rutas de autenticacion
    auth: {
        // Registro: nombre, email y contraseña.
        // No se acepta role: si alguien lo envia, Joi lo rechaza porque no esta en el esquema.
        // Asi nadie puede registrarse a si mismo como admin; todo usuario nuevo es user.
        register: Joi.object<IUser>({
            name: Joi.string().trim().required().example('Ana'),
            email: Joi.string().email().required().example('ana@example.com'),
            password: Joi.string().min(8).required().example('seminari7')
        }),

        // Login: el email y la contraseña. Aqui no se comprueba la longitud de la contraseña:
        // si es incorrecta, el servidor responde 401 igualmente
        login: Joi.object<IUser>({
            email: Joi.string().email().required().example('admin@example.com'),
            password: Joi.string().required().example('seminari7')
        })

        // Refresh y logout no tienen esquema: no llevan body, el refresh token va en una cookie
    },

    // Validaciones relacionadas con los autores
    author: {
        // Esquema que se utiliza cuando queremos crear un autor
        create: Joi.object<IAuthor>({
            // El nombre es obligatorio y debe ser un texto
            name: Joi.string().required().example('Ursula K. Le Guin'),

            // El email es obligatorio y tiene que tener un formato de email valido
            email: Joi.string().email().required().example('leguin@example.com'),

            // La fecha de nacimiento es opcional y debe ser una fecha
            birthDate: Joi.date(),

            // La nacionalidad es un texto y es opcional
            nationality: Joi.string(),

            // La biografia es opcional y no puede superar los 1000 caracteres
            biography: Joi.string().max(1000),

            // La pagina web debe tener un formato de URL valido
            website: Joi.string().uri(),

            // La foto tambien debe ser una URL valida
            photoUrl: Joi.string().uri(),

            // Indica si el autor esta activo o no
            active: Joi.boolean()
        }),

        // Esquema que se utiliza para actualizar un autor
        update: Joi.object<IAuthor>({
            // Estos campos son obligatorios tambien al actualizar
            name: Joi.string().required(),
            email: Joi.string().email().required(),

            // El resto de campos son opcionales
            birthDate: Joi.date(),
            nationality: Joi.string(),
            biography: Joi.string().max(1000),
            website: Joi.string().uri(),
            photoUrl: Joi.string().uri(),
            active: Joi.boolean()
        })
    },

    // Validaciones relacionadas con los libros
    book: {
        // Esquema que se utiliza cuando queremos crear un libro
        create: Joi.object<IBook>({
            // El titulo es obligatorio
            title: Joi.string().required().example('A Wizard of Earthsea'),

            // El libro tiene que tener como minimo un autor
            // Ademas cada autor debe tener un id con formato valido de MongoDB
            authors: Joi.array().items(Joi.string().regex(OBJECT_ID)).min(1).required().example(['6ab2d1ad9ada2730451295a7']),

            // El ISBN es obligatorio
            isbn: Joi.string().required().example('9788400000008'),

            // La edicion tiene que ser como minimo la numero 1
            edition: Joi.number().min(1),

            // El resto de estos datos son opcionales
            publisher: Joi.string(),

            // El año de publicacion debe estar entre 1450 y 2100
            publishedYear: Joi.number().min(1450).max(2100),

            // El numero de paginas tiene que ser como minimo 1
            pages: Joi.number().min(1),

            // El idioma tiene que ser uno de los idiomas permitidos
            language: Joi.string().valid(...BOOK_LANGUAGES),

            // Los tags tienen que pertenecer a la lista de tags permitidos
            tags: Joi.array().items(Joi.string().valid(...BOOK_TAGS)),

            // El precio no puede ser negativo
            price: Joi.number().min(0),

            //El campo de descripcion es opcional y puede ser un string vacio
            description: Joi.string().allow('').optional().example('Sinopsis o descripción del libro')
        }),

        // Esquema que se utiliza para actualizar un libro
        update: Joi.object<IBook>({
            // Estos campos son obligatorios al actualizar el libro
            title: Joi.string().required(),
            authors: Joi.array().items(Joi.string().regex(OBJECT_ID)).min(1).required(),
            isbn: Joi.string().required(),

            // La edicion no puede ser menor que 1
            edition: Joi.number().min(1),

            // Datos opcionales del libro
            publisher: Joi.string(),

            // Comprobamos que el año esta dentro del rango permitido
            publishedYear: Joi.number().min(1450).max(2100),

            // El numero de paginas debe ser mayor que 0
            pages: Joi.number().min(1),

            // El idioma tiene que estar dentro de los permitidos
            language: Joi.string().valid(...BOOK_LANGUAGES),

            // Los tags tienen que ser valores permitidos
            tags: Joi.array().items(Joi.string().valid(...BOOK_TAGS)),

            // El precio no puede ser negativo
            price: Joi.number().min(0),

            //El campo de descripcion es opcional y puede ser un string vacio
            description: Joi.string().allow('').optional().example('Sinopsis o descripción del libro')
        })
    }
};

export const ValidatePagination = (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = Schemas.pagination.validate(req.query);

    if (error) {
        return res.status(400).json({ message: error.details[0].message });
    }

    res.locals.query = value;
    next();
};
