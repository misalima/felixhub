export function filterActiveEnrollments<T extends { id: string }>(
  enrollments: T[],
  snapshots: Array<{ enrollment_id: string }>,
): T[] {
  const activeIds = new Set(snapshots.map((item) => item.enrollment_id));
  return enrollments.filter((item) => activeIds.has(item.id));
}
