import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { Question } from '@/types/simulados';
import type { TablesInsert, TablesUpdate } from '@/types/database.types';

export async function getQuestions(filters: {
  area?: string | null;
  subject?: string | null;
  search?: string | null;
  difficulty?: string | null;
  level?: string | null;
  hideUsed?: boolean | null;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, Math.floor(Number(filters.page)) || 1);
  const pageSize = typeof filters.pageSize === 'number' && filters.pageSize >= 0 
    ? Math.floor(filters.pageSize) 
    : (filters.pageSize === undefined ? 20 : 20);
  const isPaginated = pageSize > 0;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('questions')
    .select('*, exam_questions(exams(id, title, status))', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (filters.area) query = query.eq('knowledge_area', filters.area);
  if (filters.subject) query = query.ilike('subject', `%${filters.subject}%`);
  if (filters.search) query = query.or(`statement.ilike.%${filters.search}%,topic.ilike.%${filters.search}%`);
  if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);
  if (filters.level) query = query.eq('level', filters.level);

  // If hideUsed is requested, we need to exclude only questions that are linked
  // to exams with status === 'applied'. PostgREST nested filters are limited,
  // so fetch matching rows and filter in JS while preserving pagination.
  if (filters.hideUsed) {
    // fetch all matching rows (no range) then filter out applied exams
    const { data: allData, error: allDataError } = await query;
    if (allDataError) throw new Error(allDataError.message);

    const filtered = (allData as unknown as Question[]).filter(q => !q.exam_questions || q.exam_questions.every(eq => eq.exams.status !== 'applied'));
    const total = filtered.length;
    const paged = isPaginated ? filtered.slice(from, to + 1) : filtered;

    return {
      data: paged as Question[],
      total,
    };
  }

  const { data, count, error } = isPaginated ? await query.range(from, to) : await query;
  if (error) throw new Error(error.message);

  return {
    data: data as unknown as Question[],
    total: count || 0,
  };
}

export async function getQuestionById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('questions')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data as Question;
}

export async function createQuestion(payload: TablesInsert<'questions'>) {
  const {
    knowledge_area,
    subject,
    topic,
    statement,
    image_url,
    option_a,
    option_b,
    option_c,
    option_d,
    option_e,
    answer,
    teacher_name,
    difficulty,
    level,
  } = payload;

  if (
    !knowledge_area ||
    !subject ||
    !statement ||
    !option_a ||
    !option_b ||
    !option_c ||
    !option_d ||
    !option_e ||
    !answer
  ) {
    throw new Error('Preencha todos os campos obrigatórios.');
  }

  const { data, error } = await supabaseAdmin
    .from('questions')
    .insert({
      knowledge_area,
      subject,
      topic: topic || null,
      statement,
      image_url: image_url || null,
      option_a,
      option_b,
      option_c,
      option_d,
      option_e,
      answer,
      teacher_name: teacher_name || null,
      difficulty: difficulty || null,
      level: level || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Question;
}

export async function updateQuestion(id: string, payload: TablesUpdate<'questions'>) {
  const { data, error } = await supabaseAdmin
    .from('questions')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Question;
}

export async function deleteQuestion(id: string) {
  const { error } = await supabaseAdmin
    .from('questions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw new Error(error.message);
  return true;
}
