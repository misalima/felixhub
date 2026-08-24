import type { AttendanceSituation } from "@/types/class-council";
import type { StudentOccurrenceSummary } from "@/types/student-occurrence";

export type StudentDirectoryItem = {
  studentId: string;
  name: string;
  enrollmentNumber: string;
  situation: AttendanceSituation;
  current: null | {
    classId: string;
    className: string;
    gradeLevel: 1 | 2 | 3 | null;
    attendanceRate: number | null;
    attendanceSituation: AttendanceSituation;
    enrollmentStatus: string | null;
  };
  occurrences: StudentOccurrenceSummary;
};

export type StudentDirectoryData = {
  source: null | {
    councilId: string;
    schoolYear: number;
    term: number;
  };
  students: StudentDirectoryItem[];
  metrics: {
    total: number;
    current: number;
    infrequent: number;
    dropout: number;
    transferred: number;
    withOccurrences: number;
    occurrences: number;
  };
};
