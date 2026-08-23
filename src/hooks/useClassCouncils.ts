import { useQuery } from "@tanstack/react-query";
import { councilFetch } from "@/lib/class-council/client";

const COUNCIL_CACHE_TIME = 30 * 60 * 1000;

export const classCouncilQueryKeys = {
  all: ["class-councils"] as const,
  list: () => [...classCouncilQueryKeys.all, "list"] as const,
  council: (councilId: string) => [...classCouncilQueryKeys.all, "detail", councilId] as const,
  overview: (councilId: string) => [...classCouncilQueryKeys.council(councilId), "overview"] as const,
  workspace: (councilId: string, classId: string) => [...classCouncilQueryKeys.council(councilId), "class", classId] as const,
};

export function useClassCouncils<T>() {
  return useQuery({
    queryKey: classCouncilQueryKeys.list(),
    queryFn: () => councilFetch<T>("/api/class-councils"),
    gcTime: COUNCIL_CACHE_TIME,
  });
}

export function useClassCouncil<T>(councilId: string) {
  return useQuery({
    queryKey: classCouncilQueryKeys.overview(councilId),
    queryFn: () => councilFetch<T>(`/api/class-councils/${councilId}`),
    enabled: Boolean(councilId),
    gcTime: COUNCIL_CACHE_TIME,
  });
}

export function useClassCouncilWorkspace<T>(councilId: string, classId: string) {
  return useQuery({
    queryKey: classCouncilQueryKeys.workspace(councilId, classId),
    queryFn: () => councilFetch<T>(`/api/class-councils/${councilId}/classes/${classId}`),
    enabled: Boolean(councilId && classId),
    gcTime: COUNCIL_CACHE_TIME,
  });
}
