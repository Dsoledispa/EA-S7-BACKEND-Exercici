import { NextFunction, Request, Response } from 'express';
import AuthorService from '../services/AuthorService';
import type { PaginationQuery } from '../middleware/Joi';
import { notifyAuthorsChanged } from '../sockets/Notifications';

// Función para crear un autor nuevo
// Cogemos los datos que nos llegan en el body y se los pasamos al servicio
const createAuthor = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const author = await AuthorService.createAuthor(req.body);

        // Si se ha creado correctamente devolvemos el autor creado
        // El codigo 201 indica que se ha creado un recurso nuevo
        res.status(201).json({ author });

        // Avisamos por socket.io a los usuarios conectados (req.user lo dejo VerifyToken)
        notifyAuthorsChanged({ action: 'created', id: String(author._id), name: author.name, userId: req.user!.id });
    } catch (error) {
        // Si ocurre algun error lo pasamos al siguiente middleware
        // para que se encargue de gestionarlo
        next(error);
    }
};

// Función para buscar un autor concreto a partir de su ID
const readAuthor = async (req: Request<{ authorId: string }>, res: Response, next: NextFunction) => {
    // Cogemos el ID del autor que viene en los parametros de la URL
    const authorId = req.params.authorId;

    try {
        // Buscamos el autor usando el servicio
        const author = await AuthorService.getAuthorById(authorId);

        // Comprobamos si hemos encontrado el autor
        if (author) {
            // Si existe devolvemos sus datos
            res.status(200).json({ author });
        } else {
            // Si no existe devolvemos un error 404
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        // En caso de error lo pasamos al siguiente middleware
        next(error);
    }
};

// Función para obtener todos los autores
const readAll = async (req: Request, res: Response<unknown, { query: PaginationQuery }>, next: NextFunction) => {
    try {
        // Pedimos al servicio la pagina de autores y el total de autores no borrados
        const { page, limit, search } = res.locals.query;
        const result = await AuthorService.getAllAuthors(page, limit, search);

        // Devolvemos los autores junto con los datos de paginacion
        res.status(200).json(result);
    } catch (error) {
        // Si hay algun error lo pasamos al siguiente middleware
        next(error);
    }
};

// Función para modificar los datos de un autor
const updateAuthor = async (req: Request<{ authorId: string }>, res: Response, next: NextFunction) => {
    // Cogemos el ID del autor de los parametros de la URL
    const authorId = req.params.authorId;

    try {
        // Pasamos al servicio el ID del autor y los nuevos datos
        const author = await AuthorService.updateAuthor(authorId, req.body);

        // Comprobamos si se ha encontrado y actualizado el autor
        if (author) {
            // Si todo ha ido bien devolvemos el autor actualizado
            res.status(200).json({ author });

            // Avisamos por socket.io del cambio
            notifyAuthorsChanged({ action: 'updated', id: String(author._id), name: author.name, userId: req.user!.id });
        } else {
            // Si no existe el autor devolvemos un error 404
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        // Si ocurre algun error lo gestionamos mediante el siguiente middleware
        next(error);
    }
};

// Función para eliminar un autor
const deleteAuthor = async (req: Request<{ authorId: string }>, res: Response, next: NextFunction) => {
    // Cogemos el ID del autor que queremos eliminar
    const authorId = req.params.authorId;

    try {
        // Llamamos al servicio para eliminar el autor
        const author = await AuthorService.deleteAuthor(authorId);

        // Comprobamos si el autor existia
        if (author) {
            // Si se ha eliminado correctamente devolvemos el codigo 204
            // Este codigo indica que la petición se ha realizado correctamente
            // pero no hay contenido que devolver
            res.status(204).send();

            // Avisamos por socket.io del borrado
            notifyAuthorsChanged({ action: 'deleted', id: String(author._id), name: author.name, userId: req.user!.id });
        } else {
            // Si no encontramos el autor devolvemos un error 404
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        // Si ocurre algun error lo pasamos al siguiente middleware
        next(error);
    }
};

// Exportamos todas las funciones para poder utilizarlas desde las rutas
export default { createAuthor, readAuthor, readAll, updateAuthor, deleteAuthor };
