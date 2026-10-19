import { NextFunction, Request, Response } from 'express';
import BookService from '../services/BookService';
import type { PaginationQuery } from '../middleware/Joi';
import { notifyBooksChanged } from '../sockets/Notifications';

// Función para crear un libro nuevo
// Cogemos los datos que llegan en el body y los pasamos al servicio
const createBook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const book = await BookService.createBook(req.body);

        // Si se ha creado correctamente devolvemos el libro creado
        // El codigo 201 indica que se ha creado un recurso nuevo
        res.status(201).json({ book });

        // Avisamos por socket.io a los usuarios conectados (req.user lo dejo VerifyToken)
        notifyBooksChanged({ action: 'created', id: String(book._id), name: book.title, userId: req.user!.id });
    } catch (error) {
        // Si ocurre algun error lo pasamos al siguiente middleware
        next(error);
    }
};

// Función para buscar un libro concreto usando su ID
const readBook = async (req: Request<{ bookId: string }>, res: Response, next: NextFunction) => {
    // Cogemos el ID del libro de los parametros de la URL
    const bookId = req.params.bookId;

    try {
        // Buscamos el libro usando el servicio
        const book = await BookService.getBookById(bookId);

        // Comprobamos si hemos encontrado el libro
        if (book) {
            // Si existe devolvemos sus datos
            res.status(200).json({ book });
        } else {
            // Si no existe devolvemos un error 404
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        // Si ocurre algun error lo pasamos al siguiente middleware
        next(error);
    }
};

// Función para obtener todos los libros
const readAll = async (req: Request, res: Response<unknown, { query: PaginationQuery }>, next: NextFunction) => {
    try {
        // Pedimos al servicio la pagina de libros y el total de libros no borrados
        const { page, limit, search } = res.locals.query;
        const result = await BookService.getAllBooks(page, limit, search);

        // Devolvemos los libros junto con los datos de paginacion
        res.status(200).json(result);
    } catch (error) {
        // Si ocurre algun error lo pasamos al siguiente middleware
        next(error);
    }
};

// Función para modificar los datos de un libro
const updateBook = async (req: Request<{ bookId: string }>, res: Response, next: NextFunction) => {
    // Cogemos el ID del libro de los parametros de la URL
    const bookId = req.params.bookId;

    try {
        // Pasamos al servicio el ID y los nuevos datos del libro
        const book = await BookService.updateBook(bookId, req.body);

        // Comprobamos si el libro se ha encontrado y actualizado
        if (book) {
            // Si todo ha ido bien devolvemos el libro actualizado
            res.status(200).json({ book });

            // Avisamos por socket.io del cambio
            notifyBooksChanged({ action: 'updated', id: String(book._id), name: book.title, userId: req.user!.id });
        } else {
            // Si no existe el libro devolvemos un error 404
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        // Si ocurre algun error lo pasamos al siguiente middleware
        next(error);
    }
};

// Función para eliminar un libro
const deleteBook = async (req: Request<{ bookId: string }>, res: Response, next: NextFunction) => {
    // Cogemos el ID del libro que queremos eliminar
    const bookId = req.params.bookId;

    try {
        // Llamamos al servicio para eliminar el libro
        const book = await BookService.deleteBook(bookId);

        // Comprobamos si el libro existia
        if (book) {
            // Si se ha eliminado correctamente devolvemos el codigo 204
            // Este codigo indica que la petición se ha realizado correctamente
            // pero no hay contenido que devolver
            res.status(204).send();

            // Avisamos por socket.io del borrado
            notifyBooksChanged({ action: 'deleted', id: String(book._id), name: book.title, userId: req.user!.id });
        } else {
            // Si no encontramos el libro devolvemos un error 404
            res.status(404).json({ message: 'not found' });
        }
    } catch (error) {
        // Si ocurre algun error lo pasamos al siguiente middleware
        next(error);
    }
};

// Exportamos todas las funciones para poder utilizarlas en las rutas
export default { createBook, readBook, readAll, updateBook, deleteBook };
