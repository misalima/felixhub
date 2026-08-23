"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { CouncilStudentsPrintDocument, CouncilStudentsPrintShell } from "@/components/class-council/CouncilStudentPrintDocuments";
import type { ClassWorkspaceData } from "@/components/class-council/ClassWorkspace";
import { councilFetch } from "@/lib/class-council/client";

function PrintLoading() {
  return <main className="grid min-h-[60vh] place-items-center"><p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Preparando resultados dos estudantes...</p></main>;
}

function CouncilStudentsPrintContent() {
  const { councilId, classId } = useParams<{ councilId: string; classId: string }>();
  const searchParams = useSearchParams();
  const enrollmentId = searchParams.get("student");
  const [data, setData] = useState<ClassWorkspaceData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    councilFetch<ClassWorkspaceData>(`/api/class-councils/${councilId}/classes/${classId}`)
      .then((result) => { if (active) setData(result); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Falha ao carregar os resultados dos estudantes."); });
    return () => { active = false; };
  }, [classId, councilId]);

  if (error) return <main className="mx-auto max-w-3xl p-8"><p className="flex items-center gap-2 text-destructive"><AlertCircle className="h-5 w-5" />{error}</p></main>;
  if (!data) return <PrintLoading />;

  const selectedStudent = enrollmentId ? data.students.find((student) => student.enrollmentId === enrollmentId) : null;
  if (enrollmentId && !selectedStudent) return <main className="mx-auto max-w-3xl p-8"><p className="flex items-center gap-2 text-destructive"><AlertCircle className="h-5 w-5" />Estudante não encontrado nesta turma.</p></main>;

  const documentTitle = selectedStudent
    ? `${selectedStudent.name} - Conselho de Classe - ${data.council.term}º Bimestre ${data.council.school_year}`
    : `Turma ${data.class.display_name} - Resultados dos Estudantes - Conselho de Classe - ${data.council.term}º Bimestre ${data.council.school_year}`;
  const studentCount = selectedStudent ? 1 : data.students.length;

  return <CouncilStudentsPrintShell backHref={`/hub/conselhos/${councilId}/turmas/${classId}`} documentTitle={documentTitle} studentCount={studentCount}>
    <CouncilStudentsPrintDocument data={data} enrollmentId={enrollmentId} />
  </CouncilStudentsPrintShell>;
}

export default function CouncilStudentsPrintPage() {
  return <Suspense fallback={<PrintLoading />}><CouncilStudentsPrintContent /></Suspense>;
}
