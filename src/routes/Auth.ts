import express from 'express';

import controller from '../controllers/Auth';

import { Schemas, ValidateJoi } from '../middleware/Joi';

// Rutas de autenticacion. Son publicas: no piden token. Refresh y logout trabajan con la cookie
// HttpOnly del refresh token, que el navegador envia solo a estas rutas (path=/auth).
// Register y login validan el body con Joi; refresh y logout no tienen body.
const router = express.Router();
router.post('/register', ValidateJoi(Schemas.auth.register), controller.register);
router.post('/login', ValidateJoi(Schemas.auth.login), controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
export = router;

// Documentacion de Swagger de las cuatro rutas.
// security: [] quita el candado: son las unicas rutas que no necesitan token.

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registra un usuario nuevo
 *     description: El usuario se crea siempre con el rol user. No devuelve token, hay que hacer login despues.
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/RegisterInput' }
 *     responses:
 *       201:
 *         description: Usuario creado
 *         content:
 *           application/json:
 *             schema: { type: object, properties: { user: { $ref: '#/components/schemas/User' } } }
 *       409: { $ref: '#/components/responses/Conflict' }
 *       422: { $ref: '#/components/responses/Unprocessable' }
 *
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Inicia sesion
 *     description: >
 *       Devuelve el access token (para la cabecera Authorization) y el usuario. El refresh token no va en el JSON:
 *       se deja en la cookie HttpOnly `refreshToken` (SameSite=Strict, Path=/auth, 7 dias; Secure en produccion).
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/LoginInput' }
 *     responses:
 *       200: { $ref: '#/components/responses/LoginOk' }
 *       401: { $ref: '#/components/responses/BadCredentials' }
 *       422: { $ref: '#/components/responses/Unprocessable' }
 *
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Pide un access token nuevo
 *     description: Se usa cuando el access token ha caducado. Lee el refresh token de la cookie que dejo el login; no lleva body.
 *     security: [{ refreshCookie: [] }]
 *     responses:
 *       200:
 *         description: Access token nuevo
 *         content:
 *           application/json:
 *             example: { token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 *
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Cierra la sesion
 *     description: Borra la cookie del refresh token. Despues, /auth/refresh responde 401 hasta que se vuelva a hacer login.
 *     security: [{ refreshCookie: [] }]
 *     responses:
 *       204:
 *         description: Cookie borrada
 */
