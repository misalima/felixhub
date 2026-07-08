import FolhaRespostaClientPage from "./FolhaRespostaClientPage";

interface FolhaRespostaPageProps {
  params: Promise<{ examId: string }>;
}

export default async function FolhaRespostaPage({ params }: FolhaRespostaPageProps) {
  const { examId } = await params;
  return <FolhaRespostaClientPage examId={examId} />;
}
