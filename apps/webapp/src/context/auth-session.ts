/**
 * claims (payload) del token JWT de acceso.
 */
export type AuthClaims = {
	/** ID único del usuario */
	sub: string;
	/** Correo electrónico */
	email: string;
	/** Rol del usuario */
	role: string;
};

/**
 * Snapshot del estado de sesión actual.
 */
export type AuthSessionSnapshot = {
	/** Token de acceso JWT */
	accessToken: string | null;
	/** claims decodificados */
	claims: AuthClaims | null;
};

/**
 * Listener para cambios en la sesión.
 */
type SessionListener = (snapshot: AuthSessionSnapshot) => void;

/**
 * Token de acceso en memoria (no persiste en localStorage por seguridad).
 */
let accessToken: string | null = null;

/**
 * Conjunto de listeners suscritos.
 */
const listeners = new Set<SessionListener>();

/**
 * Decodifica una cadena Base64URL a texto.
 *
 * @param value - Cadena codificada
 * @returns Texto decodificado
 */
const base64UrlDecode = (value: string) => {
	const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
	const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);

	return atob(padded);
};

/**
 * Decodifica los claims desde un token JWT.
 *
 * @param token - Token de acceso
 * @returns Claims o null si es inválido
 */
export const decodeAccessTokenClaims = (token: string): AuthClaims | null => {

/**
 * Obtiene el snapshot de sesión actual.
 *
 * @returns Snapshot con token y claims
 */
export const getAuthSession = (): AuthSessionSnapshot => ({

/**
 * Notifica a todos los listeners del cambio.
 */
const notifyListeners = () => {

/**
 * Establece el token de acceso en memoria.
 *
 * @param nextAccessToken - Token JWT o null
 */
export const setAuthAccessToken = (nextAccessToken: string | null) => {

/**
 * Limpia el token de acceso (logout).
 */
export const clearAuthAccessToken = () => {

/**
 * Suscribe un listener a cambios de sesión.
 *
 * @param listener - Función a llamar en cambios
 * @returns Función para cancelar la suscripción
 */
export const subscribeAuthSession = (listener: SessionListener) => {