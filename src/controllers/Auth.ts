import { CookieOptions, NextFunction, Request, Response } from 'express';
import ms from 'ms';
import { config } from '../config/config';
import AuthService from '../services/AuthService';

// Nombre de la cookie en la que viaja el refresh token
export const REFRESH_COOKIE = 'refreshToken';

// Opciones de la cookie del refresh token. Van en una sola función para que login y logout
// usen exactamente las mismas: si cambian path o sameSite, el navegador no la borraría al salir.
//
//   httpOnly  JavaScript no puede leerla (document.cookie no la muestra): un script inyectado
//             por XSS no se la puede llevar, que es justo lo que pasaba con localStorage
//   sameSite  'strict': el navegador no la envía en peticiones que provoca otra web (CSRF)
//   secure    solo por HTTPS; en desarrollo va por http://localhost, así que solo en producción
//   path      solo se envía a las rutas de /auth, que son las únicas que la necesitan
//   maxAge    la cookie caduca a la vez que el refresh token (JWT_REFRESH_EXPIRES_IN, en ms)
const refreshCookieOptions = (): CookieOptions => ({
    httpOnly: true,
    sameSite: 'strict',
    secure: config.server.isProduction,
    path: '/auth',
    maxAge: ms(String(config.jwt.refreshExpiresIn) as ms.StringValue)
});

// Función para registrar un usuario nuevo
// Según el contrato, el registro no devuelve token: el frontend lleva al usuario a la página de login
const register = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await AuthService.register(req.body);

        // 201 porque se ha creado un recurso nuevo
        res.status(201).json({ user });
    } catch (error) {
        // Si el email ya existe, el ErrorHandler responde 409
        next(error);
    }
};

// Función para iniciar sesión
const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const result = await AuthService.login(req.body.email, req.body.password);

        if (result) {
            // El refresh token va en la cookie HttpOnly y no aparece en el JSON.
            // El access token sí se devuelve: el frontend lo guarda solo en memoria.
            res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions());
            res.status(200).json({ token: result.token, user: result.user });
        } else {
            // 401: no se ha podido identificar al usuario
            res.status(401).json({ message: 'Email o contraseña incorrectos' });
        }
    } catch (error) {
        next(error);
    }
};

// Función para pedir un access token nuevo con el refresh token
const refresh = async (req: Request, res: Response, next: NextFunction) => {
    // El refresh token ya no viene en el body: lo lee cookie-parser de la cabecera Cookie
    const refreshToken = req.cookies?.[REFRESH_COOKIE];

    if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
        return res.status(401).json({ message: 'Falta el refresh token' });
    }

    try {
        const result = await AuthService.refresh(refreshToken);

        if (result) {
            // Devolvemos { token }
            res.status(200).json(result);
        } else {
            res.status(401).json({ message: 'El usuario ya no existe' });
        }
    } catch (error) {
        // Si el refresh token está caducado o no es válido, el ErrorHandler responde 401
        next(error);
    }
};

// Función para cerrar sesión: borra la cookie del refresh token.
// Los tokens no se guardan en el servidor, así que cerrar sesión es que el navegador olvide la cookie
// (y el frontend, el access token que tiene en memoria). Después, /auth/refresh responde 401.
const logout = (req: Request, res: Response) => {
    // clearCookie necesita las mismas opciones (sobre todo path) con las que se creó la cookie
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());

    // 204: ha ido bien y no hay nada que devolver
    res.status(204).send();
};

export default { register, login, refresh, logout };
