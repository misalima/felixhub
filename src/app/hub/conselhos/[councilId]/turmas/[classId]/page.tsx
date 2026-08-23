"use client";

import { useCallback } from "react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { ClassWorkspace, type ClassWorkspaceData } from "@/components/class-council/ClassWorkspace";
import { ClassWorkspaceSkeleton } from "@/components/class-council/LoadingSkeletons";
import { classCouncilQueryKeys, useClassCouncilWorkspace } from "@/hooks/useClassCouncils";

export default function CouncilClassPage() {
  const { councilId, classId } = useParams<{ councilId: string; classId: string }>();
  const queryClient = useQueryClient();
  const { data, error, isPending, refetch } = useClassCouncilWorkspace<ClassWorkspaceData>(councilId, classId);
  const reload = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: classCouncilQueryKeys.council(councilId), refetchType: "none" }),
      queryClient.invalidateQueries({ queryKey: classCouncilQueryKeys.list(), refetchType: "none" }),
    ]);
    const result = await refetch();
    if (result.error) throw result.error;
  }, [councilId, queryClient, refetch]);
  const hasCurrentClassData = data?.class.id === classId;
  if(error&&!hasCurrentClassData)return <main className="mx-auto max-w-4xl p-8"><div className="flex items-center gap-2 text-destructive"><AlertCircle className="h-5 w-5"/>{error instanceof Error ? error.message : "Falha ao carregar."}</div></main>;
  if(isPending||!data||!hasCurrentClassData)return <ClassWorkspaceSkeleton />;
  return <ClassWorkspace key={classId} initialData={data} councilId={councilId} classId={classId} reload={reload}/>;
}
