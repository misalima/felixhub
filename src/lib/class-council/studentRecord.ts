import type { ActivitiesStatus, AttendanceSituation } from "@/types/class-council";

export type StudentRecordContent = {
  discussed?: boolean;
  activitiesStatus?: ActivitiesStatus;
  attendanceSituation?: AttendanceSituation;
  pedagogicalObservation?: string | null;
  positiveNotes?: string | null;
  behaviors?: readonly unknown[];
};

export function hasPedagogicalContent(content: StudentRecordContent): boolean {
  return Boolean(
    (content.activitiesStatus && content.activitiesStatus !== "not_informed")
    || (content.attendanceSituation && content.attendanceSituation !== "regular")
    || content.pedagogicalObservation?.trim()
    || content.positiveNotes?.trim()
    || content.behaviors?.length,
  );
}

export function shouldAutoMarkAsDiscussed(patch: StudentRecordContent): boolean {
  return !("discussed" in patch) && hasPedagogicalContent(patch);
}

export function hasStudentCouncilRecord(content: StudentRecordContent, interventionCount = 0): boolean {
  return Boolean(content.discussed) || hasPedagogicalContent(content) || interventionCount > 0;
}
