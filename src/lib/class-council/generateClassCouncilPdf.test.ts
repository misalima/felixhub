import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { describe, expect, it } from "vitest";
import { classCouncilPdfFileName, generateClassCouncilPdf, type ClassCouncilPdfData } from "./generateClassCouncilPdf";

function sampleData(): ClassCouncilPdfData {
  return {
    council: { term: 2, school_year: 2026, meeting_date: "2026-08-22" },
    class: {
      display_name: "1MA",
      official_code: "1ª SÉRIE A MATUTINO",
      class_strengths: "Participação nas atividades coletivas e boa colaboração entre os estudantes.",
      general_difficulties: "Dificuldades recorrentes de leitura, organização dos estudos e resolução de problemas.",
      behavior_and_coexistence: "A turma precisa melhorar a escuta durante as explicações.",
      learning_aspects: "Ritmos de aprendizagem variados, com necessidade de retomadas em pequenos grupos.",
      collective_strategies: "Acompanhamento quinzenal, atividades orientadas e contato com as famílias quando necessário.",
    },
    participants: [
      { name: "PROFESSORA UM", role_or_subject: "LÍNGUA PORTUGUESA E SUAS LITERATURAS" },
      { name: "PROFESSOR DOIS", role_or_subject: "ARTES" },
      { name: "PROFESSORA TRÊS", role_or_subject: "PRÁTICAS DE INTEGRAÇÃO COM O TERRITÓRIO (PIT)" },
      { name: "COORDENADORA TESTE", role_or_subject: "COORDENAÇÃO PEDAGÓGICA" },
    ],
    subjects: [{ display_name: "MATEMÁTICA", teacher_name: "PROFESSORA TESTE" }],
    classInterventions: [{ description: "Realizar acompanhamento coletivo quinzenal.", responsible_name: "Coordenação", due_date: "2026-09-30" }],
    students: Array.from({ length: 9 }, (_, index) => ({
      enrollmentNumber: `TESTE-${index + 1}`,
      name: `ESTUDANTE DE TESTE ${index + 1}`,
      isPcd: index === 0,
      attendanceRate: index % 2 === 0 ? 74.5 : 92,
      discussed: true,
      activitiesStatus: index % 3 === 0 ? "does_not_do" : "irregular",
      pedagogicalObservation: "Necessita de acompanhamento nas atividades, com orientações objetivas e verificação frequente da compreensão.",
      positiveNotes: "Demonstra interesse quando recebe apoio individual e participa bem de atividades práticas.",
      alerts: { atRisk: index % 2 === 0, reasons: index % 2 === 0 ? ["4 disciplinas com nota abaixo de 6,0", "Frequência anual abaixo de 80%"] : [] },
      behaviors: [{ category: "excessive_talking", description: null }],
      interventions: [{ description: "Conversa individual e acompanhamento das atividades propostas.", responsible_name: "Coordenação", due_date: "2026-09-15" }],
    })),
  };
}

describe("generateClassCouncilPdf", () => {
  it("gera um PDF multipágina com nome estável", async () => {
    const data = sampleData();
    const pdf = await generateClassCouncilPdf(data);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(10_000);
    expect(classCouncilPdfFileName(data)).toBe("Conselho de Classe - 2º Bimestre 2026 - Turma 1MA.pdf");

    const outputPath = process.env.CLASS_COUNCIL_PDF_OUTPUT;
    if (outputPath) {
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, pdf);
    }
  });
});
