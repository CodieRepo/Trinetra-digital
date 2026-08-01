export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E; code: string };

export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function failure<E extends Error>(error: E, code: string): Result<never, E> {
  return { success: false, error, code };
}
