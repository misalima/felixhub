export const LOGIN_SERVICE_UNAVAILABLE =
  "O serviço está temporariamente indisponível. Tente novamente mais tarde e avise o time de suporte.";

/** Only confirmed credential errors should suggest that the password is wrong. */
export function getLoginErrorMessage(error: unknown): string {
  const details =
    error && typeof error === "object"
      ? (error as { code?: string; name?: string; status?: number; message?: string })
      : {};

  if (
    details.status === 0 ||
    (typeof details.status === "number" && details.status >= 500) ||
    details.name === "AuthRetryableFetchError" ||
    details.name === "AuthUnknownError" ||
    details.name === "AbortError" ||
    details.name === "TimeoutError" ||
    /failed to fetch|fetch failed|network ?error|network request failed|load failed/i.test(details.message ?? "")
  ) {
    return LOGIN_SERVICE_UNAVAILABLE;
  }

  if (
    details.code === "invalid_credentials" ||
    (!details.code && details.message === "Invalid login credentials")
  ) {
    return "E-mail ou senha incorretos.";
  }

  if (details.status === 429) {
    return "Muitas tentativas de acesso. Aguarde alguns minutos e tente novamente.";
  }

  if (details.code === "email_not_confirmed") {
    return "Confirme seu e-mail antes de entrar.";
  }

  return "Não foi possível entrar. Tente novamente mais tarde e avise o time de suporte se o problema persistir.";
}
