import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { Exam, ExamWithQuestions } from '@/types/simulados';
import type { TablesInsert, TablesUpdate } from '@/types/database.types';

export async function getExams(filters?: { 
  search?: string | null; 
  grade?: string | null; 
  school_class?: string | null; 
  area?: string | null; 
  status?: string | null;
  page?: number;
  pageSize?: number;
}) {
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 12;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('exams')
    .select('*, exam_questions(count)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    if (filters.status === 'not_applied') {
      query = query.neq('status', 'applied');
    } else {
      query = query.eq('status', filters.status);
    }
  }

  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  if (filters?.grade) {
    query = query.eq('grade', filters.grade as NonNullable<TablesInsert<'exams'>['grade']>);
  }

  if (filters?.school_class) {
    query = query.eq('school_class', filters.school_class);
  }

  if (filters?.area) {
    // Se filtrado por área, buscamos os IDs dos simulados que contém questões daquela área
    const { data: matchedExams, error: areaError } = await supabaseAdmin
      .from('exam_questions')
      .select('exam_id, questions!inner(knowledge_area)')
      .eq('questions.knowledge_area', filters.area);

    if (areaError) throw new Error(areaError.message);
    
    const examIds = Array.from(new Set(matchedExams?.map(me => me.exam_id) || []));
    if (examIds.length === 0) return { data: [], total: 0 };
    query = query.in('id', examIds);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) throw new Error(error.message);

  const exams = (data ?? []).map((exam) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const countArr = (exam as any).exam_questions as { count: number }[] | undefined;
    const questions_count = countArr?.[0]?.count ?? 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { exam_questions: _eq, ...rest } = exam as any;
    void _eq;
    return { ...rest, questions_count } as Exam;
  });

  return { data: exams, total: count || 0 };
}

export async function getExamFilters() {
  const { data, error } = await supabaseAdmin
    .from('exams')
    .select('school_class')
    .not('school_class', 'is', null);

  if (error) throw new Error(error.message);

  const uniqueClasses = Array.from(new Set(data.map((item) => item.school_class)))
    .filter(Boolean)
    .sort() as string[];

  return { school_classes: uniqueClasses };
}

export async function getExamById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('exams')
    .select('*, exam_questions(*, question:questions(*))')
    .eq('id', id)
    .order('position', { referencedTable: 'exam_questions', ascending: true })
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as ExamWithQuestions;
}

export async function createExam(payload: TablesInsert<'exams'>) {
  const {
    title,
    description,
    school_name,
    school_year,
    grade,
    date_label,
    duration,
    instructions,
  } = payload;

  if (!title) {
    throw new Error('Título é obrigatório.');
  }

  const { data, error } = await supabaseAdmin
    .from('exams')
    .insert({
      title,
      description: description || null,
      school_name: school_name || 'ESCOLA ESTADUAL PROFESSOR JOSÉ FÉLIX DE CARVALHO ALVES',
      school_year: school_year || null,
      grade: grade || null,
      school_class: payload.school_class || null,
      date_label: date_label || null,
      duration: duration || null,
      instructions: instructions || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Exam;
}

export async function updateExam(id: string, payload: TablesUpdate<'exams'> & { title: string }) {
  const { data, error } = await supabaseAdmin
    .from('exams')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Exam;
}

export async function deleteExam(id: string) {
  const { error } = await supabaseAdmin.from('exams').delete().eq('id', id);
  if (error) throw new Error(error.message);
  return true;
}

export async function duplicateExam(id: string) {
  const originalExam = await getExamById(id);
  
  if (!originalExam) {
    throw new Error('Simulado original não encontrado.');
  }

  // 1. Create a copy of the exam
  const newExamData: TablesInsert<'exams'> = {
    title: `${originalExam.title} (Cópia)`,
    description: originalExam.description,
    school_name: originalExam.school_name,
    school_year: originalExam.school_year,
    grade: originalExam.grade,
    school_class: originalExam.school_class,
    date_label: originalExam.date_label,
    duration: originalExam.duration,
    instructions: originalExam.instructions,
    status: 'draft',
  };

  const newExam = await createExam(newExamData);

  // 2. Duplicate associations
  if (originalExam.exam_questions && originalExam.exam_questions.length > 0) {
    const associations = originalExam.exam_questions.map((eq) => ({
      exam_id: newExam.id,
      question_id: eq.question_id,
      position: eq.position,
    }));

    const { error: insertError } = await supabaseAdmin
      .from('exam_questions')
      .insert(associations);

    if (insertError) {
      throw new Error(`Erro ao duplicar questões: ${insertError.message}`);
    }
  }

  return newExam;
}
