import AnswerSheetClientPage from "./AnswerSheetClientPage";

interface FolhaRespostaPageProps {
  params: Promise<{ examId: string }>;
}

export default async function FolhaRespostaPage({ params }: FolhaRespostaPageProps) {
  const { examId } = await params;
  return <AnswerSheetClientPage examId={examId} />;
}
