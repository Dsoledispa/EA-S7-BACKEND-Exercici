import mongoose, { Document, Schema, Types } from 'mongoose';
import type { DefaultEventsMap, Server, Socket } from 'socket.io';

// Estos son los datos que guardaremos de cada mensaje.
export interface IMessage {
    room: string;
    user: Types.ObjectId;
    text: string;
    timestamp: Date;
}

// Esta interfaz añade a los datos de un mensaje las propiedades del documento de MongoDB.
export interface IMessageModel extends IMessage, Document {}

// Este esquema explica a Mongoose cómo guardar y validar cada mensaje.
const MessageSchema: Schema = new Schema(
    {
        // Sala a la que pertenece el mensaje, por ejemplo "general" o un identificador de chat directo.
        room: { type: String, required: true, trim: true },

        // Identificador del usuario que escribió. "ref" indica que apunta al modelo User.
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },

        // Contenido escrito por el usuario. El chat rechaza antes los mensajes más largos.
        text: { type: String, required: true, trim: true, maxlength: 2000 },

        // Fecha y hora de creación. Mongoose la establece automáticamente al guardar el mensaje.
        timestamp: { type: Date, default: Date.now }
    },
    {
        // Evita que Mongoose añada su propio campo __v a cada mensaje.
        versionKey: false
    }
);

// Exporta el modelo para poder crear y consultar mensajes desde el código del chat.
export default mongoose.model<IMessageModel>('Message', MessageSchema);

// ---- Interfaces del chat (eventos de Socket.IO) ----

// Datos que el cliente envía para entrar a una sala de chat.
export interface ChatJoinPayload {
    room: string;
}

// Datos que el cliente envía para mandar un mensaje a una sala.
export interface ChatMessagePayload {
    room: string;
    text: string;
}

// Un mensaje tal como lo envía el servidor, en chat:message y dentro de chat:history.
// El usuario llega con su nombre para que el frontend pueda mostrarlo.
export interface ChatMessage {
    _id: string;
    room: string;
    user: { _id: string; name: string };
    text: string;
    timestamp: Date;
}

// Aviso que el servidor envía a un solo cliente cuando algo no se puede hacer.
export interface ChatError {
    message: string;
}

// Eventos que el cliente puede enviar al servidor (socket.emit en el frontend, socket.on aquí).
export interface ClientToServerEvents {
    'chat:join': (payload: ChatJoinPayload) => void;
    'chat:message': (payload: ChatMessagePayload) => void;
}

// ---- Eventos que no son del chat: avisos del backoffice ----

// Aviso de que un admin ha creado, editado o borrado un libro o un autor.
// Lo envía el servidor a todos los conectados (ver sockets/Notifications.ts).
export interface BackofficeChange {
    action: 'created' | 'updated' | 'deleted';
    // Id y nombre (título del libro o nombre del autor) de lo que ha cambiado
    id: string;
    name: string;
    // Id del usuario que lo ha hecho, sacado del token
    userId: string;
}

// Eventos que el servidor envía al cliente (socket.emit aquí, socket.on en el frontend).
export interface ServerToClientEvents {
    'chat:history': (messages: ChatMessage[]) => void;
    'chat:message': (message: ChatMessage) => void;
    'chat:error': (error: ChatError) => void;
    // Lista de ids de los usuarios con el chat abierto; se envía a todos cada vez que alguien entra o sale
    'users:online': (userIds: string[]) => void;
    // Avisos del backoffice: a todos los conectados, cada vez que cambia un libro o un autor
    'books:changed': (change: BackofficeChange) => void;
    'authors:changed': (change: BackofficeChange) => void;
}

// Lo que el middleware SocketAuth guarda en cada conexión (socket.data).
export interface SocketData {
    user: { id: string };
}

// Con estos tipos, TypeScript avisa si se emite un evento que no existe o con datos que no tocan.
export type ChatServer = Server<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>;
export type ChatSocket = Socket<ClientToServerEvents, ServerToClientEvents, DefaultEventsMap, SocketData>;
