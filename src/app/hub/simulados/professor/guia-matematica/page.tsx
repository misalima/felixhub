"use client";

import { ArrowLeft, Calculator, SquareSigma, Shapes, FunctionSquare, Plus, Minus, Beaker } from "lucide-react";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

function MathBlock({ children }: { children: string }) {
  return (
    <div className="prose prose-slate dark:prose-invert">
      <MarkdownRenderer>
        {children}
      </MarkdownRenderer>
    </div>
  );
}

function FormulaRow({ name, syntax, example }: { name: string; syntax: string; example: string }) {
  return (
    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
      <td className="p-4 align-middle font-medium">{name}</td>
      <td className="p-4 align-middle">
        <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold text-foreground">
          {syntax}
        </code>
      </td>
      <td className="p-4 align-middle text-lg">
        <MathBlock>{example}</MathBlock>
      </td>
    </tr>
  );
}

export default function GuiaMatematicaPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-background">
      <div className="p-6 max-w-5xl mx-auto pb-24">
        {/* Header Publico Saudoso */}
        <div className="mb-10 mt-4">
          <button
            onClick={() => window.close()}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Fechar Guia e Voltar
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Calculator className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Guia Rápido de Símbolos Matemáticos
              </h1>
              <p className="text-muted-foreground mt-1">
                Aprenda a renderizar qualquer fórmula nas suas questões. Padrão compatível com vestibulares e ENEM.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Card 1 */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="flex flex-col space-y-1.5 p-6 border-b bg-muted/20">
                <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <Plus className="w-5 h-5 text-blue-500" />
                    <Minus className="w-4 h-4 text-blue-500 relative top-1" />
                  </div> Operações Básicas
                </h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full caption-bottom text-sm min-w-[500px]">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Símbolo</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Como digitar</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Exemplo Visual</th>
                    </tr>
                  </thead>
                  <tbody>
                    <FormulaRow name="Adição / Subtração" syntax="$a + b$" example="$a + b$" />
                    <FormulaRow name="Multiplicação (X)" syntax="$a \times b$" example="$a \times b$" />
                    <FormulaRow name="Multiplicação (Ponto)" syntax="$a \cdot b$" example="$a \cdot b$" />
                    <FormulaRow name="Divisão (Barra)" syntax="$a / b$" example="$a / b$" />
                    <FormulaRow name="Divisão (Símbolo ÷)" syntax="$a \div b$" example="$a \div b$" />
                    <FormulaRow name="Mais ou Menos" syntax="$\pm 2$" example="$\pm 2$" />
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card 2 */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="flex flex-col space-y-1.5 p-6 border-b bg-muted/20">
                <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
                  <FunctionSquare className="w-5 h-5 text-amber-500" /> Frações, Potências e Raízes
                </h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full caption-bottom text-sm min-w-[500px]">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Símbolo</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Como digitar</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Exemplo Visual</th>
                    </tr>
                  </thead>
                  <tbody>
                    <FormulaRow name="Fração" syntax="$\frac{a}{b}$" example="$\frac{a}{b}$" />
                    <FormulaRow name="Exponencial" syntax="$x^2$ ou $x^{10}$" example="$x^2$ ou $x^{10}$" />
                    <FormulaRow name="Índice" syntax="$a_1$ ou $a_{ij}$" example="$a_1$ ou $a_{ij}$" />
                    <FormulaRow name="Raiz Quadrada" syntax="$\sqrt{x}$" example="$\sqrt{x}$" />
                    <FormulaRow name="Raiz Cúbica" syntax="$\sqrt[3]{x}$" example="$\sqrt[3]{x}$" />
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card 3 */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="flex flex-col space-y-1.5 p-6 border-b bg-muted/20">
                <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
                  <Shapes className="w-5 h-5 text-emerald-500" /> Geometria e Relações
                </h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full caption-bottom text-sm min-w-[500px]">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Símbolo</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Como digitar</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Exemplo Visual</th>
                    </tr>
                  </thead>
                  <tbody>
                    <FormulaRow name="Igual e Diferente" syntax="$=$ ou $\neq$" example="$=$ e $\neq$" />
                    <FormulaRow name="Maior e Menor" syntax="$>$ ou $<$" example="$>$ e $<$" />
                    <FormulaRow name="Maior/Igual e Menor/Igual" syntax="$\geq$ ou $\leq$" example="$\geq$ e $\leq$" />
                    <FormulaRow name="Aproximadamente" syntax="$\approx$" example="$\approx$" />
                    <FormulaRow name="Graus" syntax="$90^\circ$" example="$90^\circ$" />
                    <FormulaRow name="Símbolos Gregos" syntax="$\pi$, $\alpha$, $\beta$" example="$\pi$, $\alpha$, $\beta$" />
                    <FormulaRow name="Triângulo (Delta)" syntax="$\Delta$" example="$\Delta$" />
                    <FormulaRow name="Infinito" syntax="$\infty$" example="$\infty$" />
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card 4 */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="flex flex-col space-y-1.5 p-6 border-b bg-muted/20">
                <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
                  <SquareSigma className="w-5 h-5 text-purple-500" /> Funções Avançadas
                </h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full caption-bottom text-sm min-w-[500px]">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Símbolo</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Como digitar</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Exemplo Visual</th>
                    </tr>
                  </thead>
                  <tbody>
                    <FormulaRow name="Seno, Cosseno..." syntax="$\sin(x)$, $\cos(x)$" example="$\sin(x)$, $\cos(x)$" />
                    <FormulaRow name="Logaritmo" syntax="$\log_{10}(x)$" example="$\log_{10}(x)$" />
                    <FormulaRow name="Limites" syntax="$\lim_{x \to 0} f(x)$" example="$\lim_{x \to 0} f(x)$" />
                    <FormulaRow name="Integral" syntax="$\int_a^b x dx$" example="$\int_a^b x dx$" />
                    <FormulaRow name="Somatório" syntax="$\sum_{i=1}^n x_i$" example="$\sum_{i=1}^n x_i$" />
                  </tbody>
                </table>
              </div>
            </div>

            {/* Card 5 - QUÍMICA (NEW) */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden">
              <div className="flex flex-col space-y-1.5 p-6 border-b bg-emerald-500/10">
                <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
                  <Beaker className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> Notação Química (mhchem)
                </h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full caption-bottom text-sm min-w-[500px]">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Tipo</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Como digitar</th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Exemplo Visual</th>
                    </tr>
                  </thead>
                  <tbody>
                    <FormulaRow name="Isótopos (mhchem)" syntax="$\ce{^{12}_{6}C}$" example="$\ce{^{12}_{6}C}$" />
                    <FormulaRow name="Isótopos (LaTeX puro)" syntax="$^{12}_{6}\mathrm{C}$" example="$^{12}_{6}\mathrm{C}$" />
                    <FormulaRow name="Íons e Cargas" syntax="$\ce{Na+}$ e $\ce{SO4^{2-}}$" example="$\ce{Na+}$ e $\ce{SO4^{2-}}$" />
                    <FormulaRow name="Fórmulas Moleculares" syntax="$\ce{H2O}$, $\ce{CO2}$" example="$\ce{H2O}$ e $\ce{CO2}$" />
                    <FormulaRow name="Reação Simples" syntax="$\ce{2H2 + O2 -> 2H2O}$" example="$\ce{2H2 + O2 -> 2H2O}$" />
                    <FormulaRow name="Reação com Condições" syntax="$\ce{N2 + 3H2 ->[Fe][400 ^\circ C] 2NH3}$" example="$\ce{N2 + 3H2 ->[Fe][400 ^\circ C] 2NH3}$" />
                    <FormulaRow name="Estados Físicos" syntax="$\ce{NaCl_{(aq)} -> Na+ + Cl-}$" example="$\ce{NaCl_{(aq)} -> Na+ + Cl-}$" />
                    <FormulaRow name="Equilíbrio Químico" syntax="$\ce{A <=> B}$" example="$\ce{A <=> B}$" />
                    <FormulaRow name="Complexos" syntax="$\ce{[Fe(CN)6]^{3-}}$" example="$\ce{[Fe(CN)6]^{3-}}$" />
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-muted/30 border-t">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <strong>Nota:</strong> O comando <code>\ce{`{...}`}</code> facilita muito a escrita química, convertendo automaticamente números para subscritos e tratando setas e cargas. Use sempre que possível em questões de Ciências da Natureza.
                </p>
              </div>
            </div>

          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            <div className="rounded-xl border bg-blue-50/50 dark:bg-blue-950/20 text-card-foreground shadow-sm overflow-hidden sticky top-6">
              <div className="p-6 bg-blue-100/50 dark:bg-blue-900/40 border-b border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-lg">💡 Como usar na questão?</h3>
              </div>
              <div className="p-6 space-y-6 text-sm">
                <div>
                  <h4 className="font-medium text-foreground mb-2">1. No meio do texto (Lado a Lado)</h4>
                  <p className="text-muted-foreground mb-3">
                    Use apenas <strong className="text-foreground">um cifrão ($)</strong> no começo e outro no fim para exibir na mesma linha.
                  </p>
                  <div className="p-3 bg-muted rounded-md font-mono text-[0.7rem] mb-2 text-foreground/80 break-words">
                    {"A área total onde $A = \\pi \\cdot r^2$ é de 10m."}
                  </div>
                  <div className="p-3 bg-background border rounded-md text-[0.85rem]">
                    A área total onde <MathBlock>{"$A = \\pi \\cdot r^2$"}</MathBlock> é de 10m.
                  </div>
                </div>

                <hr className="border-border" />

                <div>
                  <h4 className="font-medium text-foreground mb-2">2. Em Destaque (Bloco Centralizado)</h4>
                  <p className="text-muted-foreground mb-3">
                    Use <strong className="text-foreground">dois cifrões ($$)</strong> no começo e no fim para destacar a fórmula isolada.
                  </p>
                  <div className="p-3 bg-muted rounded-md font-mono text-[0.7rem] mb-2 text-foreground/80 overflow-x-auto whitespace-nowrap">
                    {"$$ \\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2} $$"}
                  </div>
                  <div className="p-3 bg-background border rounded-md">
                    <MathBlock>{"$$ \\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2} $$"}</MathBlock>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
