import Logging from '../library/Logging';
import type { BackofficeChange, ChatServer } from '../models/Message';

// Avisos del backoffice por socket.io: son eventos que no tienen nada que ver con el chat.
// Cuando un admin crea, edita o borra un libro o un autor, el controller llama a una de estas
// funciones y el servidor emite el evento a TODOS los sockets conectados (io.emit), no a una sala.
// Así el resto de usuarios se entera al momento, sin tener que recargar ni volver a pedir la lista.

// El servidor de socket.io lo crea StartChat; aquí solo guardamos la referencia para poder emitir
let io: ChatServer | null = null;

export const StartNotifications = (server: ChatServer) => {
    io = server;
};

// Un libro ha cambiado: lo avisamos a todos
export const notifyBooksChanged = (change: BackofficeChange) => {
    Logging.info(`Book ${change.action}: ${change.name}`);
    io?.emit('books:changed', change);
};

// Un autor ha cambiado: lo avisamos a todos
export const notifyAuthorsChanged = (change: BackofficeChange) => {
    Logging.info(`Author ${change.action}: ${change.name}`);
    io?.emit('authors:changed', change);
};
