"use client";

import { useEffect, useState } from "react";
import { useExam } from "@/hooks/useExams";
import { Printer, ArrowLeft, Loader2, Copy, CheckSquare } from "lucide-react";
import Image from "next/image";

interface FolhaRespostaClientPageProps {
  examId: string;
}

const FOLHA_INSTRUCTIONS =
  "Use caneta azul ou preta. Preencha completamente o círculo da alternativa escolhida. Não rasure.";

// ── Lógica de colunas ────────────────────────────────────────────────────────

type BubbleSize = "normal" | "small";
type ColumnsResult = { chunks: number[][]; size: BubbleSize };

function getCompactChunks(questionCount: number): ColumnsResult {
  const nums = Array.from({ length: questionCount }, (_, i) => i + 1);
  if (questionCount <= 30) {
    return {
      chunks: [nums.slice(0, 15), nums.slice(15)].filter((c) => c.length > 0),
      size: "normal",
    };
  } else if (questionCount <= 45) {
    const chunks: number[][] = [];
    for (let i = 0; i < nums.length; i += 15) chunks.push(nums.slice(i, i + 15));
    return { chunks, size: "normal" };
  } else {
    const chunks: number[][] = [];
    for (let i = 0; i < nums.length; i += 19) chunks.push(nums.slice(i, i + 19));
    return { chunks, size: "small" };
  }
}

function getFullChunks(questionCount: number): ColumnsResult {
  const nums = Array.from({ length: questionCount }, (_, i) => i + 1);
  const chunks: number[][] = [];
  for (let i = 0; i < nums.length; i += 20) chunks.push(nums.slice(i, i + 20));
  return { chunks, size: "normal" };
}

// ── Mini cabeçalho compacto (modo duplo / A5) ────────────────────────────────

function CompactHeader({
  schoolName,
  title,
  description,
  grade,
  schoolClass,
  schoolYear,
  date,
}: {
  schoolName: string;
  title: string;
  description?: string | null;
  grade?: string | null;
  schoolClass?: string | null;
  schoolYear?: string | null;
  date?: string | null;
}) {
  return (
    <div className="compact-header">
      <div className="compact-header-top">
        <Image src="/logo_escola.png" alt="Logo" width={24} height={24} className="compact-logo" unoptimized />
        <div className="compact-school-info">
          <span className="compact-school-name">{schoolName}</span>
          {schoolYear && <span className="compact-school-year">Ano Letivo {schoolYear}</span>}
        </div>
      </div>
      <div className="compact-title-row">
        <span className="compact-exam-title">{title}</span>
        {description && <span className="compact-exam-description">{description}</span>}
      </div>
      <div className="compact-meta-row">
        <span className="compact-label">Série:</span>
        <span className="compact-grade-value flex-1 px-2">
          {grade || <span className="inline-block border-b border-black w-full h-[10pt] mt-1" />}
        </span>
        <span className="compact-label">Turma:</span>
        <span className="compact-grade-value flex-1 px-2">
          {schoolClass || <span className="inline-block border-b border-black w-full h-[10pt] mt-1" />}
        </span>
        <span className="compact-label compact-label--date">Data:</span>
        <span className="compact-grade-value px-2 min-w-[50pt]">
          {date || <span className="inline-block border-b border-black w-full h-[10pt] mt-1" />}
        </span>
      </div>
      <div className="compact-student-row">
        <span className="compact-label">Aluno(a):</span>
        <span className="compact-line"></span>
        <span className="compact-label compact-label--nota">Nota:</span>
        <span className="compact-line compact-line--nota"></span>
      </div>
      <div className="compact-instructions">{FOLHA_INSTRUCTIONS}</div>
    </div>
  );
}

// ── Grade de bolhas ──────────────────────────────────────────────────────────

function BubbleGrid({
  questionCount,
  compact,
  answers,
}: {
  questionCount: number;
  compact?: boolean;
  answers?: string[];
}) {
  const { chunks, size } = compact
    ? getCompactChunks(questionCount)
    : getFullChunks(questionCount);

  const isSmall = size === "small";

  return (
    <div className={`bubble-sheet-container${isSmall ? " bubble-sheet--small" : ""}`}>
      {chunks.map((chunk, colIndex) => (
        <div key={colIndex} className="bubble-column">
          {chunk.map((n) => (
            <div key={n} className="bubble-row">
              <span className="question-number-bubble">{String(n).padStart(2, "0")}</span>
              <div className="bubbles-container">
                {["A", "B", "C", "D", "E"].map((letter) => {
                  const filled = answers && answers[n - 1]?.toUpperCase() === letter;
                  return (
                    <div key={letter} className="bubble-item">
                      <span className="bubble-letter">{letter}</span>
                      <div className={`bubble-circle${filled ? " bubble-circle--filled" : ""}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Página principal client-side ──────────────────────────────────────────────

export default function FolhaRespostaClientPage({ examId }: FolhaRespostaClientPageProps) {
  const { data: exam, isError } = useExam(examId);
  const [duplo, setDuplo] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--print-page-size",
      duplo ? "A4 landscape" : "A4 portrait"
    );

    return () => {
      document.documentElement.style.removeProperty("--print-page-size");
    };
  }, [duplo]);

  if (isError) {
    return (
      <div className="p-8 text-center">
        <p style={{ color: "red" }}>Erro ao carregar o simulado.</p>
        <a href={`/hub/simulados/${examId}`} style={{ fontSize: 14 }}>Voltar ao simulado</a>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const questionCount = exam.exam_questions.length;

  const actualAnswers = [...exam.exam_questions]
    .sort((a, b) => a.position - b.position)
    .map(eq => eq.question.answer);

  const answersToPass = showAnswers ? actualAnswers : undefined;

  return (
    <div className={`bg-gray-100 min-h-screen py-8 print:bg-white print:py-0 ${duplo ? "print-mode-duplo" : "print-mode-simple"}`}>
      {/* Controles — ocultos na impressão */}
      <div className="print-controls no-print">
        <a href={`/hub/simulados/${examId}`} className="btn-back" title="Voltar">
          <ArrowLeft size={16} />
        </a>

        <label className="switch-container">
          <CheckSquare size={14} style={{ color: "#fff", opacity: 0.8 }} />
          <span className="switch-label">Com respostas</span>
          <div className="switch">
            <input type="checkbox" checked={showAnswers} onChange={(e) => setShowAnswers(e.target.checked)} />
            <span className="slider"></span>
          </div>
        </label>

        <label className="switch-container">
          <Copy size={14} style={{ color: "#fff", opacity: 0.8 }} />
          <span className="switch-label">2 por folha</span>
          <div className="switch">
            <input type="checkbox" checked={duplo} onChange={(e) => setDuplo(e.target.checked)} />
            <span className="slider"></span>
          </div>
        </label>

        <button className="btn-print" onClick={() => window.print()}>
          <Printer size={16} />
          Imprimir Folha de Respostas
        </button>
      </div>

      {duplo ? (
        /* ── Modo duplo: 2 A5 lado a lado em A4 paisagem ── */
        <div className="duplo-landscape-page">
          <div className="a5-sheet">
            <CompactHeader
              schoolName={exam.school_name}
              title={exam.title}
              description={exam.description}
              grade={exam.grade}
              schoolClass={exam.school_class}
              schoolYear={exam.school_year}
              date={exam.date_label}
            />
            <div className="a5-sheet-title">FOLHA DE RESPOSTAS</div>
            <BubbleGrid questionCount={questionCount} compact answers={answersToPass} />
          </div>

          <div className="duplo-cut-line" />

          <div className="a5-sheet">
            <CompactHeader
              schoolName={exam.school_name}
              title={exam.title}
              description={exam.description}
              grade={exam.grade}
              schoolClass={exam.school_class}
              schoolYear={exam.school_year}
              date={exam.date_label}
            />
            <div className="a5-sheet-title">FOLHA DE RESPOSTAS</div>
            <BubbleGrid questionCount={questionCount} compact answers={answersToPass} />
          </div>
        </div>
      ) : (
        /* ── Modo simples: 1 folha A4 ── */
        <div
          className="print-page bg-white mx-auto shadow-lg print:shadow-none p-[6mm] w-[210mm] max-w-[210mm] min-h-0"
          style={{ minHeight: 0 }}
        >
          <div className="full-header">
            <div className="full-header-identity">
              <Image src="/logo_escola.png" alt="Logo" width={32} height={32} style={{ objectFit: "contain" }} unoptimized />
              <div>
                <p className="full-school-name">{exam.school_name}</p>
                {exam.school_year && <p className="full-school-year">Ano Letivo {exam.school_year}</p>}
              </div>
            </div>
            <div className="full-header-title">
              <p className="full-exam-title">{exam.title}</p>
              {exam.description && <p className="full-exam-description">{exam.description}</p>}
            </div>
            <div className="full-header-meta">
              <div className="full-meta-item">
                <span className="full-meta-label">Série:</span>
                <span className="full-meta-value flex-1 px-4">
                  {exam.grade || <div className="border-b border-black w-full h-[14pt]" />}
                </span>
              </div>
              <div className="full-meta-item">
                <span className="full-meta-label">Turma:</span>
                <span className="full-meta-value flex-1 px-4">
                  {exam.school_class || <div className="border-b border-black w-full h-[14pt]" />}
                </span>
              </div>
              {exam.date_label && <div className="full-meta-item"><span className="full-meta-label">Data:</span><span className="full-meta-value">{exam.date_label}</span></div>}
              {exam.duration && <div className="full-meta-item"><span className="full-meta-label">Duração:</span><span className="full-meta-value">{exam.duration}</span></div>}
            </div>
            <div className="full-header-student">
              <div className="full-student-field full-student-field--grow"><span className="full-meta-label">Aluno(a):</span><span className="full-student-line"></span></div>
              <div className="full-student-field"><span className="full-meta-label">Nota:</span><span className="full-student-line full-student-line--nota"></span></div>
            </div>
            <div className="full-header-instructions">
              <strong>Instruções:</strong> {FOLHA_INSTRUCTIONS}
            </div>
          </div>

          <h2 className="text-center font-bold text-base uppercase border-b-2 border-black pb-2 mb-5 mt-4">
            FOLHA DE RESPOSTAS
          </h2>
          <BubbleGrid questionCount={questionCount} answers={answersToPass} />
        </div>
      )}

      <style jsx global>{`
        :root {
          --print-page-size: A4 portrait;
        }

        /* Override print.css */
        .print-page {
          column-count: 1 !important;
          display: block !important;
          box-sizing: border-box;
          overflow: hidden;
          min-height: 0 !important;
          height: auto !important;
        }

        /* ── Full header (modo simples A4) ── */
        .full-header {
          border: 1pt solid #000;
          border-radius: 4pt;
          overflow: hidden;
          font-family: system-ui, sans-serif;
          margin-bottom: 3pt;
        }
        .full-header-identity {
          display: flex; align-items: center; justify-content: center;
          gap: 8pt; padding: 3pt 10pt;
          background: #f0f7ff; border-bottom: 0.5pt solid #eee; text-align: center;
        }
        .full-school-name {
          font-size: 11pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.02em; line-height: 1.1;
        }
        .full-school-year { font-size: 7.5pt; color: #666; }
        .full-header-title {
          padding: 4pt 10pt; text-align: center; border-bottom: 1px solid #000;
        }
        .full-exam-title {
          font-size: 13pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;
        }
        .full-exam-description {
          font-size: 9pt; font-style: italic; color: #444; margin-top: 2pt;
        }
        .full-header-meta {
          display: flex; border-bottom: 1px solid #000;
        }
        .full-meta-item {
          flex: 1; display: flex; align-items: center; gap: 4pt;
          padding: 2.5pt 7pt; border-right: 1px solid #000; font-family: system-ui, sans-serif;
        }
        .full-meta-item:last-child { border-right: none; }
        .full-meta-label {
          font-size: 7pt; font-weight: bold; text-transform: uppercase; color: #333; white-space: nowrap;
        }
        .full-meta-value { font-size: 9pt; }
        .full-header-student {
          display: flex; border-bottom: 1px solid #000;
        }
        .full-student-field {
          display: flex; align-items: center; gap: 4pt;
          padding: 2.5pt 7pt; border-right: 1px solid #000;
        }
        .full-student-field:last-child { border-right: none; }
        .full-student-field--grow { flex: 3; }
        .full-student-line {
          flex: 1; border-bottom: 0.5pt solid #000; min-height: 14pt;
        }
        .full-student-line--nota { flex: 0; min-width: 50pt; }
        .full-header-instructions {
          font-size: 7pt; color: #333; padding: 3pt 10pt;
          border-top: none; background: #f0f7ff; line-height: 1.25; text-align: center;
        }

        /* ── Bubble sheet ── */
        .bubble-sheet-container {
          display: flex;
          justify-content: space-evenly;
          align-items: flex-start;
          gap: 0;
          padding-top: 3pt;
          width: 100%;
        }

        .bubble-column {
          display: flex;
          flex-direction: column;
        }

        .bubble-row {
          display: flex;
          align-items: center;
          gap: 5pt;
          border-bottom: 0.5pt solid #eee;
          padding: 2.3pt 0;
          break-inside: avoid;
        }

        .question-number-bubble {
          font-weight: bold;
          font-size: 11pt;
          min-width: 18pt;
          text-align: right;
          font-family: monospace;
        }

        .bubbles-container {
          display: flex;
          gap: 4pt;
        }

        .bubble-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1pt;
        }

        .bubble-letter {
          font-size: 7.5pt;
          font-weight: bold;
          color: #444;
        }

        .bubble-circle {
          width: 15pt;
          height: 15pt;
          border: 1pt solid #000;
          border-radius: 50%;
          background: #fff;
        }

        .bubble-circle--filled {
          background: #000;
        }

        /* Tier 3 (>36 questões): bolinhas menores para caber mais */
        .bubble-sheet--small .bubble-circle {
          width: 14pt;
          height: 14pt;
        }
        .bubble-sheet--small .bubble-letter {
          font-size: 7pt;
        }
        .bubble-sheet--small .question-number-bubble {
          font-size: 10pt;
          min-width: 16pt;
        }
        .bubble-sheet--small .bubble-row {
          padding: 2.2pt 0;
        }

        /* ── Modo duplo: paisagem A4 ── */
        .duplo-landscape-page {
          width: 297mm;
          height: 210mm;
          margin: 0 auto;
          background: #fff;
          box-shadow: 0 4px 32px rgba(0,0,0,0.15);
          display: flex;
          flex-direction: row;
          align-items: stretch;
        }

        .a5-sheet {
          flex: 1;
          padding: 5mm 5mm 4mm;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
        }

        .a5-sheet-title {
          text-align: center;
          font-size: 7.5pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1pt solid #000;
          padding-bottom: 2pt;
          margin: 3pt 0 4pt;
        }

        .duplo-cut-line {
          width: 0;
          border-left: 1pt dashed #aaa;
          position: relative;
          flex-shrink: 0;
        }
        .duplo-cut-line::before {
          content: "✂";
          position: absolute;
          top: 4pt;
          left: -9pt;
          font-size: 11pt;
          color: #aaa;
        }

        /* ── Cabeçalho compacto (A5) ── */
        .compact-header {
          border: 1pt solid #000;
          border-radius: 2pt;
          overflow: hidden;
          font-family: system-ui, sans-serif;
          background: #fff;
        }
        .compact-header-top {
          display: flex; align-items: center; justify-content: center;
          gap: 5pt; padding: 2pt 5pt;
          background: #f0f7ff; border-bottom: 0.5pt solid #ccc; text-align: center;
        }
        .compact-logo { width: 20pt !important; height: 20pt !important; object-fit: contain; }
        .compact-school-info { display: flex; flex-direction: column; }
        .compact-school-name { font-size: 7pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.02em; }
        .compact-school-year { font-size: 5.5pt; color: #666; }
        .compact-title-row {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 1pt; padding: 2pt 5pt; border-bottom: 0.5pt solid #000;
        }
        .compact-exam-title { font-size: 7pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.03em; text-align: center; }
        .compact-exam-description { font-size: 5.5pt; font-style: italic; color: #555; text-align: center; }
        .compact-grade { font-size: 6pt; color: #444; white-space: nowrap; }
        .compact-student-row {
          display: flex; align-items: center; gap: 4pt; padding: 2.5pt 10pt; border-bottom: 0.5pt solid #000;
        }
        .compact-meta-row {
          display: flex; align-items: center; gap: 5pt; padding: 2.5pt 10pt; border-bottom: 0.5pt solid #000;
        }
        .compact-label { font-size: 6.5pt; font-weight: bold; text-transform: uppercase; color: #333; white-space: nowrap; }
        .compact-label--date { margin-left: 2pt; }
        .compact-grade-value { display: flex; flex: 1; font-size: 8pt; color: #000; font-weight: 500; margin-left: 2pt; margin-right: 2pt; min-width: 30pt; }
        .compact-grade-value span { width: 100%; }
        .compact-label--nota { margin-left: 6pt; }
        .compact-line { flex: 1; border-bottom: 0.5pt solid #000; min-height: 13pt; }
        .compact-line--code {
          flex: 1;
          margin-right: 4pt;
          border-bottom: 0.5pt solid #000; min-height: 13pt;
        }
        .compact-line--nota { flex: 0; min-width: 28pt; }
        .compact-instructions { font-size: 5pt; color: #444; padding: 2.5pt 10pt; background: #f0f7ff; line-height: 1.3; text-align: center; }

        /* ── Impressão ── */
        @page {
          size: var(--print-page-size);
          margin: 4mm;
        }

        @media print {
          .bubble-letter { color: #000; }
          .bubble-circle--filled {
            background-color: #000 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-page {
            width: 100%;
            max-width: none;
            min-height: 0 !important;
            height: auto !important;
            box-shadow: none;
            padding: 4mm;
            margin: 0;
            overflow: hidden;
          }

          .full-header {
            margin-bottom: 2pt;
          }
          .full-school-name {
            font-size: 8.8pt;
          }
          .full-exam-title {
            font-size: 10.8pt;
          }
          .full-header-instructions {
            font-size: 6.4pt;
          }
          .bubble-sheet-container {
            padding-top: 2pt;
            gap: 5pt;
          }
          .bubble-row {
            padding: 2pt 0;
            gap: 4pt;
          }
          .bubble-circle {
            width: 15pt;
            height: 15pt;
          }
          .bubble-letter {
            font-size: 7pt;
          }
          .question-number-bubble {
            font-size: 9pt;
            min-width: 14pt;
          }

          .duplo-landscape-page {
            width: 100%;
            height: 100vh;
            box-shadow: none;
            margin: 0;
          }
          .duplo-cut-line {
            border-left-color: #bbb;
          }
          .duplo-cut-line::before {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
