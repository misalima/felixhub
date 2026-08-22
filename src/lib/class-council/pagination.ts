export const SUPABASE_READ_PAGE_SIZE = 1_000;

export async function collectSupabasePages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  pageSize = SUPABASE_READ_PAGE_SIZE,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
