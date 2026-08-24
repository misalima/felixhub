import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "./middleware";

describe("canonical Hub routes", () => {
  it("remove o prefixo /hub no subdomínio público", async () => {
    const response = await middleware(new NextRequest("https://hub.escola.example/hub/alunos/123?tab=historico", { headers: { host: "hub.escola.example" } }));
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://hub.escola.example/alunos/123?tab=historico");
  });

  it("protege a rota limpa e usa o login limpo no subdomínio", async () => {
    const response = await middleware(new NextRequest("https://hub.escola.example/alunos/123", { headers: { host: "hub.escola.example" } }));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://hub.escola.example/login?redirect=%2Falunos%2F123");
  });

  it("reescreve a rota limpa autenticada para a estrutura interna", async () => {
    const response = await middleware(new NextRequest("https://hub.escola.example/alunos/123", { headers: { host: "hub.escola.example", cookie: "sb_access_token=test" } }));
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://hub.escola.example/hub/alunos/123");
  });

  it("preserva /hub no acesso por subpasta", async () => {
    const response = await middleware(new NextRequest("http://localhost:3000/hub/alunos/123", { headers: { cookie: "sb_access_token=test" } }));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("location")).toBeNull();
  });
});
