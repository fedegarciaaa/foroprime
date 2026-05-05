/**
 * Tipo discriminado estándar para retornos de Server Actions.
 * El cliente puede testear `result.ok` y obtener errores tipados sin try/catch.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });
export const fail = (
  error: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> => ({ ok: false, error, fieldErrors });

/**
 * Mensajes de error orientados al usuario (los detalles van a logs).
 */
export const ERR = {
  UNAUTHENTICATED: "Tienes que iniciar sesión",
  RATE_LIMITED: "Estás haciendo eso demasiado rápido. Espera un momento.",
  NOT_FOUND: "No encontrado",
  FORBIDDEN: "No tienes permiso para hacer eso",
  INVALID_INPUT: "Datos inválidos",
  UNKNOWN: "Algo salió mal. Inténtalo de nuevo.",
} as const;
