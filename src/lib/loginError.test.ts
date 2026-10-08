import { describe, expect, it } from "vitest";
import { AuthApiError, AuthRetryableFetchError, AuthUnknownError } from "@supabase/supabase-js";
import { getLoginErrorMessage, LOGIN_SERVICE_UNAVAILABLE } from "./loginError";

describe("login error messages", () => {
  it.each([502, 503, 504])("reports service unavailability for HTTP %s", (status) => {
    expect(getLoginErrorMessage(new AuthRetryableFetchError("Service unavailable", status)))
      .toBe(LOGIN_SERVICE_UNAVAILABLE);
  });

  it.each([
    new AuthRetryableFetchError("Failed to fetch", 0),
    new TypeError("Failed to fetch"),
    new TypeError("Load failed"),
    new Error("NetworkError when attempting to fetch resource."),
    new AuthUnknownError("Unexpected response", new SyntaxError("Invalid JSON")),
    { name: "TimeoutError" },
    { status: 500, code: "unexpected_failure" },
    { status: 503, code: "invalid_credentials" },
  ])("does not blame credentials for network or server failures: %s", (error) => {
    expect(getLoginErrorMessage(error)).toBe(LOGIN_SERVICE_UNAVAILABLE);
  });

  it("reports confirmed invalid credentials", () => {
    expect(getLoginErrorMessage(new AuthApiError("Invalid login credentials", 400, "invalid_credentials")))
      .toBe("E-mail ou senha incorretos.");
    expect(getLoginErrorMessage(new AuthApiError("Invalid login credentials", 400, undefined)))
      .toBe("E-mail ou senha incorretos.");
  });

  it("does not treat every HTTP 400 or 401 as a wrong password", () => {
    for (const status of [400, 401]) {
      expect(getLoginErrorMessage({ status, message: "Unexpected error" }))
        .toContain("Não foi possível entrar");
    }
  });

  it("gives useful guidance for rate limits and unconfirmed emails", () => {
    expect(getLoginErrorMessage({ status: 429 })).toContain("Muitas tentativas");
    expect(getLoginErrorMessage({ code: "email_not_confirmed", status: 400 }))
      .toBe("Confirme seu e-mail antes de entrar.");
  });

  it.each([null, "internal details", { message: "sensitive internal details" }])(
    "keeps unknown errors safe and actionable: %s", (error) => {
      expect(getLoginErrorMessage(error)).toBe(
        "Não foi possível entrar. Tente novamente mais tarde e avise o time de suporte se o problema persistir.",
      );
    },
  );
});
