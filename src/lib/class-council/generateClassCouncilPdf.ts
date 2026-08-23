import { readFileSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";
import { BEHAVIOR_LABELS } from "@/lib/class-council/constants";
import { SCHOOL_LOCATION, SCHOOL_NAME, SCHOOL_SHORT_NAME } from "@/constants/main/school";
import type { BehaviorCategory } from "@/types/class-council";

type PdfIntervention = { description: string; responsible_name: string | null; due_date: string | null };
export type ClassCouncilPdfData = {
  council: { term: number; school_year: number; meeting_date: string };
  class: {
    display_name: string;
    official_code: string;
    class_strengths: string | null;
    general_difficulties: string | null;
    behavior_and_coexistence: string | null;
    learning_aspects: string | null;
    collective_strategies: string | null;
  };
  subjects: Array<{ display_name: string; teacher_name: string | null }>;
  participants: Array<{ name: string; role_or_subject: string | null }>;
  classInterventions: PdfIntervention[];
  students: Array<{
    enrollmentNumber: string;
    name: string;
    isPcd: boolean;
    attendanceRate: number | null;
    discussed: boolean;
    activitiesStatus: string;
    pedagogicalObservation: string | null;
    positiveNotes: string | null;
    alerts: { atRisk: boolean; reasons: string[] };
    behaviors: Array<{ category: string; description: string | null }>;
    interventions: PdfIntervention[];
  }>;
};

const PAGE_MARGIN = 42;
const PAGE_BOTTOM_MARGIN = 46;
const COLORS = {
  ink: "#0f172a",
  muted: "#64748b",
  border: "#cbd5e1",
  surface: "#f8fafc",
  blue: "#1d4ed8",
  red: "#991b1b",
};

const activityLabels: Record<string, string> = {
  not_informed: "Não informado",
  regular: "Regular",
  irregular: "Irregular",
  does_not_do: "Não realiza",
};

const lowercaseTitleWords = new Set(["a", "as", "com", "da", "das", "de", "do", "dos", "e", "em", "na", "nas", "no", "nos", "o", "os", "para"]);

function printableText(value: string) {
  return value.replace(/[–—‑]/g, "-").replace(/\s+$/gm, "");
}

function naturalCase(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized !== normalized.toLocaleUpperCase("pt-BR")) return normalized;
  return normalized.toLocaleLowerCase("pt-BR").split(/(\s+)/).map((word, index) => {
    if (!word.trim()) return word;
    if (/^\([a-z0-9]+\)$/i.test(word)) return word.toLocaleUpperCase("pt-BR");
    if (index > 0 && lowercaseTitleWords.has(word)) return word;
    return `${word.charAt(0).toLocaleUpperCase("pt-BR")}${word.slice(1)}`;
  }).join("");
}

function interventionText(intervention: PdfIntervention) {
  const hasMetadata = Boolean(intervention.responsible_name || intervention.due_date);
  return [
    hasMetadata ? intervention.description.trim().replace(/[.;:,]+$/, "") : intervention.description,
    intervention.responsible_name ? `Responsável: ${intervention.responsible_name}` : null,
    intervention.due_date ? `Prazo: ${formatDate(intervention.due_date)}` : null,
  ].filter(Boolean).join("; ");
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");
}

function formatAttendance(value: number | null) {
  return value === null ? "não informada" : `${value.toLocaleString("pt-BR")}%`;
}

export function classCouncilPdfFileName(data: ClassCouncilPdfData) {
  const className = data.class.display_name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-").trim();
  return `Conselho de Classe - ${data.council.term}º Bimestre ${data.council.school_year} - Turma ${className}.pdf`;
}

export async function generateClassCouncilPdf(data: ClassCouncilPdfData): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, bufferPages: true, info: {
    Title: classCouncilPdfFileName(data).replace(/\.pdf$/i, ""),
    Author: SCHOOL_NAME,
    Subject: `Resumo da turma ${data.class.display_name}`,
    Creator: "Felix Hub",
  } });
  const chunks: Buffer[] = [];
  const completed = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const contentWidth = doc.page.width - PAGE_MARGIN * 2;
  const pageBottom = () => doc.page.height - PAGE_BOTTOM_MARGIN;

  function continuationHeader() {
    doc.font("Helvetica-Bold").fontSize(8).fillColor(COLORS.muted)
      .text(printableText(`${SCHOOL_SHORT_NAME} - Turma ${data.class.display_name} - continuação`), PAGE_MARGIN, 26, { width: contentWidth });
    doc.moveTo(PAGE_MARGIN, 39).lineTo(PAGE_MARGIN + contentWidth, 39).strokeColor(COLORS.border).lineWidth(0.6).stroke();
    doc.y = 50;
  }

  function ensureSpace(height: number) {
    if (doc.y + height <= pageBottom()) return;
    doc.addPage();
    continuationHeader();
  }

  function sectionTitle(title: string) {
    ensureSpace(34);
    if (doc.y > 120) doc.moveDown(0.65);
    doc.font("Helvetica-Bold").fontSize(13).fillColor(COLORS.ink)
      .text(printableText(title), PAGE_MARGIN, doc.y, { width: contentWidth });
    doc.moveDown(0.25);
    doc.moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_MARGIN + contentWidth, doc.y).strokeColor(COLORS.border).lineWidth(0.7).stroke();
    doc.moveDown(0.55);
  }

  function labeledParagraph(label: string, value: string, options: { indent?: number; color?: string } = {}) {
    const indent = options.indent ?? 0;
    const width = contentWidth - indent;
    const normalized = printableText(value);
    doc.font("Helvetica").fontSize(9.5);
    const estimatedHeight = doc.heightOfString(`${label}: ${normalized}`, { width, lineGap: 1.5 }) + 5;
    ensureSpace(Math.min(estimatedHeight, pageBottom() - 55));
    doc.font("Helvetica-Bold").fillColor(COLORS.ink).text(`${printableText(label)}: `, PAGE_MARGIN + indent, doc.y, { continued: true, width });
    doc.font("Helvetica").fillColor(options.color ?? COLORS.ink).text(normalized, { width, lineGap: 1.5 });
    doc.moveDown(0.25);
  }

  function bulletLine(value: string, indent = 10) {
    const normalized = printableText(value);
    doc.font("Helvetica").fontSize(9).fillColor(COLORS.ink);
    const height = doc.heightOfString(`- ${normalized}`, { width: contentWidth - indent, lineGap: 1 }) + 3;
    ensureSpace(Math.min(height, pageBottom() - 55));
    doc.text(`- ${normalized}`, PAGE_MARGIN + indent, doc.y, { width: contentWidth - indent, lineGap: 1 });
    doc.moveDown(0.15);
  }

  function participantLine(name: string, roleOrSubject: string | null) {
    const normalizedName = printableText(naturalCase(name));
    const normalizedRole = roleOrSubject ? printableText(naturalCase(roleOrSubject)) : null;
    const line = normalizedRole ? `${normalizedName} - ${normalizedRole}` : normalizedName;
    doc.font("Helvetica").fontSize(9.5);
    const height = doc.heightOfString(line, { width: contentWidth - 10, lineGap: 1 }) + 4;
    ensureSpace(height);
    doc.font("Helvetica-Bold").fillColor(COLORS.ink)
      .text(normalizedName, PAGE_MARGIN + 10, doc.y, { continued: Boolean(normalizedRole), width: contentWidth - 10, lineGap: 1 });
    if (normalizedRole) doc.font("Helvetica").fillColor(COLORS.muted).text(` - ${normalizedRole}`, { width: contentWidth - 10, lineGap: 1 });
    doc.moveDown(0.2);
  }

  // Cabeçalho principal.
  const headerTop = PAGE_MARGIN;
  try {
    doc.image(readFileSync(join(process.cwd(), "public", "logo_escola.png")), PAGE_MARGIN, headerTop, { fit: [52, 52], align: "center", valign: "center" });
  } catch {
    // O texto mantém a identificação institucional caso o logo não esteja disponível.
  }
  const headerTextX = PAGE_MARGIN + 64;
  doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.ink).text(printableText(SCHOOL_NAME), headerTextX, headerTop + 1, { width: contentWidth - 64 });
  doc.font("Helvetica").fontSize(8.5).fillColor(COLORS.muted).text(printableText(SCHOOL_LOCATION), headerTextX, doc.y + 2, { width: contentWidth - 64 });
  doc.font("Helvetica-Bold").fontSize(17).fillColor(COLORS.ink).text(`Resumo da turma ${printableText(data.class.display_name)}`, headerTextX, doc.y + 7, { width: contentWidth - 64 });
  doc.font("Helvetica").fontSize(9).fillColor(COLORS.muted).text(printableText(`${data.council.school_year} - ${data.council.term}º bimestre - ${formatDate(data.council.meeting_date)} - ${naturalCase(data.class.official_code)}`), headerTextX, doc.y + 3, { width: contentWidth - 64 });
  doc.y = headerTop + 70;
  doc.moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_MARGIN + contentWidth, doc.y).strokeColor(COLORS.ink).lineWidth(1.2).stroke();
  doc.moveDown(0.75);

  // Indicadores.
  const discussedStudents = data.students.filter((student) => student.discussed);
  const atRiskCount = data.students.filter((student) => student.alerts.atRisk).length;
  const interventionCount = data.classInterventions.length + data.students.reduce((total, student) => total + student.interventions.length, 0);
  const metrics = [
    [String(data.students.length), "Estudantes"],
    [String(atRiskCount), "Em risco"],
    [String(discussedStudents.length), "Discutidos"],
    [String(interventionCount), "Intervenções"],
  ];
  const metricGap = 7;
  const metricWidth = (contentWidth - metricGap * 3) / 4;
  const metricTop = doc.y;
  metrics.forEach(([value, label], index) => {
    const x = PAGE_MARGIN + index * (metricWidth + metricGap);
    doc.roundedRect(x, metricTop, metricWidth, 45, 5).fillAndStroke(COLORS.surface, COLORS.border);
    doc.font("Helvetica-Bold").fontSize(15).fillColor(COLORS.ink).text(value, x + 8, metricTop + 7, { width: metricWidth - 16 });
    doc.font("Helvetica").fontSize(7.8).fillColor(COLORS.muted).text(label, x + 8, metricTop + 27, { width: metricWidth - 16 });
  });
  doc.y = metricTop + 51;

  sectionTitle("Participantes");
  if (data.participants.length) data.participants.forEach((participant) => participantLine(participant.name, participant.role_or_subject));
  else doc.font("Helvetica-Oblique").fontSize(9).fillColor(COLORS.muted).text("Nenhum participante registrado.", PAGE_MARGIN, doc.y, { width: contentWidth });

  sectionTitle("Análise coletiva");
  const collectiveNotes = [
    ["Pontos positivos", data.class.class_strengths],
    ["Dificuldades gerais", data.class.general_difficulties],
    ["Comportamento e convivência", data.class.behavior_and_coexistence],
    ["Aspectos de aprendizagem", data.class.learning_aspects],
    ["Estratégias e intervenções coletivas", data.class.collective_strategies],
  ] as const;
  const filledCollectiveNotes = collectiveNotes.filter((entry) => Boolean(entry[1]?.trim()));
  if (filledCollectiveNotes.length) filledCollectiveNotes.forEach(([label, value]) => { if (value) labeledParagraph(label, value); });
  else doc.font("Helvetica-Oblique").fontSize(9).fillColor(COLORS.muted).text("Sem análise coletiva registrada.");

  sectionTitle("Estudantes discutidos");
  if (!discussedStudents.length) {
    doc.font("Helvetica-Oblique").fontSize(9).fillColor(COLORS.muted).text("Nenhum estudante foi marcado como discutido.");
  }
  for (const student of discussedStudents) {
    // Evita deixar apenas o cabeçalho do estudante no fim da página. Registros
    // muito extensos ainda podem continuar na página seguinte naturalmente.
    ensureSpace(150);
    const studentTop = doc.y;
    doc.rect(PAGE_MARGIN, studentTop, contentWidth, 25).fill(COLORS.surface);
    doc.font("Helvetica-Bold").fontSize(10.5).fillColor(COLORS.ink).text(printableText(student.name), PAGE_MARGIN + 8, studentTop + 7, { width: contentWidth - 135, lineBreak: false, ellipsis: true });
    let badgeRight = PAGE_MARGIN + contentWidth - 8;
    if (student.alerts.atRisk) {
      const width = 52;
      badgeRight -= width;
      doc.roundedRect(badgeRight, studentTop + 6, width, 13, 3).strokeColor(COLORS.red).lineWidth(0.7).stroke();
      doc.font("Helvetica-Bold").fontSize(6.8).fillColor(COLORS.red).text("EM RISCO", badgeRight, studentTop + 9, { width, align: "center", lineBreak: false });
      badgeRight -= 5;
    }
    if (student.isPcd) {
      const width = 28;
      badgeRight -= width;
      doc.roundedRect(badgeRight, studentTop + 6, width, 13, 3).strokeColor(COLORS.blue).lineWidth(0.7).stroke();
      doc.font("Helvetica-Bold").fontSize(6.8).fillColor(COLORS.blue).text("PCD", badgeRight, studentTop + 9, { width, align: "center", lineBreak: false });
    }
    doc.y = studentTop + 31;
    labeledParagraph("Matrícula", `${student.enrollmentNumber} - Frequência: ${formatAttendance(student.attendanceRate)}`, { indent: 7, color: COLORS.muted });
    if (student.alerts.reasons.length) labeledParagraph("Alertas", student.alerts.reasons.join("; "), { indent: 7, color: COLORS.red });
    labeledParagraph("Atividades", activityLabels[student.activitiesStatus] ?? student.activitiesStatus, { indent: 7 });
    if (student.pedagogicalObservation) labeledParagraph("Observação pedagógica", student.pedagogicalObservation, { indent: 7 });
    if (student.positiveNotes) labeledParagraph("Pontos positivos", student.positiveNotes, { indent: 7 });
    if (student.behaviors.length) {
      const behaviors = student.behaviors.map((behavior) => behavior.category === "other" && behavior.description?.trim()
        ? behavior.description.trim()
        : `${BEHAVIOR_LABELS[behavior.category as BehaviorCategory] ?? behavior.category}${behavior.description ? ` - ${behavior.description}` : ""}`);
      labeledParagraph("Comportamentos observados", behaviors.join(" | "), { indent: 7 });
    }
    if (student.interventions.length) {
      for (const intervention of student.interventions) {
        labeledParagraph(
          "Intervenção",
          interventionText(intervention),
          { indent: 7 },
        );
      }
    }
    ensureSpace(10);
    doc.moveTo(PAGE_MARGIN, doc.y + 2).lineTo(PAGE_MARGIN + contentWidth, doc.y + 2).strokeColor(COLORS.border).lineWidth(0.5).stroke();
    doc.y += 9;
  }

  sectionTitle("Intervenções coletivas");
  if (data.classInterventions.length) {
    for (const intervention of data.classInterventions) {
      bulletLine(interventionText(intervention));
    }
  } else {
    doc.font("Helvetica-Oblique").fontSize(9).fillColor(COLORS.muted).text("Nenhuma intervenção coletiva registrada.");
  }

  ensureSpace(30);
  doc.moveDown(0.9);
  doc.moveTo(PAGE_MARGIN, doc.y).lineTo(PAGE_MARGIN + contentWidth, doc.y).strokeColor(COLORS.border).lineWidth(0.5).stroke();
  doc.moveDown(0.35);
  doc.font("Helvetica").fontSize(7.5).fillColor(COLORS.muted)
    .text("Documento gerado pelo Felix Hub.", PAGE_MARGIN, doc.y, { width: contentWidth });

  const pageRange = doc.bufferedPageRange();
  for (let pageIndex = pageRange.start; pageIndex < pageRange.start + pageRange.count; pageIndex += 1) {
    doc.switchToPage(pageIndex);
    doc.font("Helvetica").fontSize(7).fillColor(COLORS.muted)
      .text(`Página ${pageIndex + 1} de ${pageRange.count}`, PAGE_MARGIN, doc.page.height - 56, { width: contentWidth, align: "right", lineBreak: false });
  }
  doc.end();
  return completed;
}
