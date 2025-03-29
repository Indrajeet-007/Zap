import { t, type TSchema } from "elysia";

export const OkType = <T extends TSchema>(T: T) =>
  t.Object({
    value: T,
    error: t.Undefined(),
  });

export const ErrType = <T extends TSchema>(T: T) =>
  t.Object({
    value: t.Undefined(),
    error: T,
  });

export const ResultType = <T extends TSchema, E extends TSchema>(T: T, E: E) =>
  t.Union([OkType(T), ErrType(E)]);

export function ok<T>(value: T): { value: T; error: undefined } {
  return { value, error: undefined };
}

export function err<E>(error: E): { value: undefined; error: E } {
  return { value: undefined, error };
}
