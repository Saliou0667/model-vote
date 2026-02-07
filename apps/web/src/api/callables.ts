import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

type CallableSuccess<T> = {
  success: true;
  data: T;
};

export async function callFunction<TInput extends Record<string, unknown>, TOutput>(
  name: string,
  payload: TInput,
): Promise<TOutput> {
  const callable = httpsCallable<TInput, CallableSuccess<TOutput>>(functions, name);
  const result = await callable(payload);
  if (!result.data?.success) {
    throw new Error(`Function ${name} failed`);
  }
  return result.data.data;
}

export function getErrorMessage(error: unknown): string {
  const maybe = error as { message?: string };
  return maybe.message ?? "Une erreur est survenue.";
}
