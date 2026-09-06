export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      alunos_boletins: {
        Row: {
          created_at: string | null
          data_nascimento: string
          id: string
          matricula: string | null
          nome_completo: string
          storage_path: string
          turma: string
        }
        Insert: {
          created_at?: string | null
          data_nascimento: string
          id?: string
          matricula?: string | null
          nome_completo: string
          storage_path: string
          turma: string
        }
        Update: {
          created_at?: string | null
          data_nascimento?: string
          id?: string
          matricula?: string | null
          nome_completo?: string
          storage_path?: string
          turma?: string
        }
        Relationships: []
      }
      class_council_audit_log: {
        Row: {
          actor_id: string
          council_class_id: string | null
          council_id: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: number
          metadata: Json
        }
        Insert: {
          actor_id: string
          council_class_id?: string | null
          council_id: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: never
          metadata?: Json
        }
        Update: {
          actor_id?: string
          council_class_id?: string | null
          council_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: never
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "class_council_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_audit_log_council_class_id_fkey"
            columns: ["council_class_id"]
            isOneToOne: false
            referencedRelation: "class_council_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_audit_log_council_id_fkey"
            columns: ["council_id"]
            isOneToOne: false
            referencedRelation: "class_councils"
            referencedColumns: ["id"]
          },
        ]
      }
      class_council_behaviors: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string | null
          enrollment_id: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          created_at?: string
          created_by: string
          description?: string | null
          enrollment_id: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          enrollment_id?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_council_behaviors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_behaviors_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "class_council_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_behaviors_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_council_classes: {
        Row: {
          behavior_and_coexistence: string | null
          class_strengths: string | null
          collective_strategies: string | null
          completed_at: string | null
          completed_by: string | null
          council_id: string
          created_at: string
          created_by: string
          display_name: string
          editing_by: string | null
          editing_expires_at: string | null
          general_difficulties: string | null
          grade_label: string
          grade_level: number | null
          id: string
          learning_aspects: string | null
          official_code: string
          row_version: number
          shift: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          behavior_and_coexistence?: string | null
          class_strengths?: string | null
          collective_strategies?: string | null
          completed_at?: string | null
          completed_by?: string | null
          council_id: string
          created_at?: string
          created_by: string
          display_name: string
          editing_by?: string | null
          editing_expires_at?: string | null
          general_difficulties?: string | null
          grade_label: string
          grade_level?: number | null
          id?: string
          learning_aspects?: string | null
          official_code: string
          row_version?: number
          shift: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          behavior_and_coexistence?: string | null
          class_strengths?: string | null
          collective_strategies?: string | null
          completed_at?: string | null
          completed_by?: string | null
          council_id?: string
          created_at?: string
          created_by?: string
          display_name?: string
          editing_by?: string | null
          editing_expires_at?: string | null
          general_difficulties?: string | null
          grade_label?: string
          grade_level?: number | null
          id?: string
          learning_aspects?: string | null
          official_code?: string
          row_version?: number
          shift?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_council_classes_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_classes_council_id_fkey"
            columns: ["council_id"]
            isOneToOne: false
            referencedRelation: "class_councils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_classes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_classes_editing_by_fkey"
            columns: ["editing_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_classes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_council_enrollments: {
        Row: {
          activities_status: string
          attendance_situation: string
          council_class_id: string
          created_at: string
          created_by: string
          discussed: boolean
          id: string
          pedagogical_observation: string | null
          positive_notes: string | null
          student_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activities_status?: string
          attendance_situation?: string
          council_class_id: string
          created_at?: string
          created_by: string
          discussed?: boolean
          id?: string
          pedagogical_observation?: string | null
          positive_notes?: string | null
          student_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activities_status?: string
          attendance_situation?: string
          council_class_id?: string
          created_at?: string
          created_by?: string
          discussed?: boolean
          id?: string
          pedagogical_observation?: string | null
          positive_notes?: string | null
          student_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_council_enrollments_council_class_id_fkey"
            columns: ["council_class_id"]
            isOneToOne: false
            referencedRelation: "class_council_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_enrollments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_enrollments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_council_imports: {
        Row: {
          blocking_error_count: number
          confirmed_at: string | null
          confirmed_by: string | null
          council_id: string
          created_at: string
          created_by: string
          file_mime_type: string
          file_sha256: string
          file_size_bytes: number
          id: string
          issues: Json
          original_file_name: string
          original_file_path: string
          source_generated_at: string | null
          status: string
          summary: Json
          updated_at: string
          version: number
          warning_count: number
        }
        Insert: {
          blocking_error_count?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          council_id: string
          created_at?: string
          created_by: string
          file_mime_type?: string
          file_sha256: string
          file_size_bytes: number
          id?: string
          issues?: Json
          original_file_name: string
          original_file_path: string
          source_generated_at?: string | null
          status?: string
          summary?: Json
          updated_at?: string
          version: number
          warning_count?: number
        }
        Update: {
          blocking_error_count?: number
          confirmed_at?: string | null
          confirmed_by?: string | null
          council_id?: string
          created_at?: string
          created_by?: string
          file_mime_type?: string
          file_sha256?: string
          file_size_bytes?: number
          id?: string
          issues?: Json
          original_file_name?: string
          original_file_path?: string
          source_generated_at?: string | null
          status?: string
          summary?: Json
          updated_at?: string
          version?: number
          warning_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_council_imports_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_imports_council_id_fkey"
            columns: ["council_id"]
            isOneToOne: false
            referencedRelation: "class_councils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_imports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_council_interventions: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          id: string
          origin_class_id: string | null
          origin_council_id: string | null
          origin_enrollment_id: string | null
          outcome: string | null
          reason: string | null
          responsible_name: string | null
          source_type: string
          started_at: string | null
          status: string
          status_changed_at: string
          target_class_official_code: string | null
          target_class_name: string | null
          target_school_year: number | null
          target_student_id: string | null
          target_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          description: string
          due_date?: string | null
          id?: string
          origin_class_id?: string | null
          origin_council_id?: string | null
          origin_enrollment_id?: string | null
          outcome?: string | null
          reason?: string | null
          responsible_name?: string | null
          source_type?: string
          started_at?: string | null
          status?: string
          status_changed_at?: string
          target_class_official_code?: string | null
          target_class_name?: string | null
          target_school_year?: number | null
          target_student_id?: string | null
          target_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          id?: string
          origin_class_id?: string | null
          origin_council_id?: string | null
          origin_enrollment_id?: string | null
          outcome?: string | null
          reason?: string | null
          responsible_name?: string | null
          source_type?: string
          started_at?: string | null
          status?: string
          status_changed_at?: string
          target_class_official_code?: string | null
          target_class_name?: string | null
          target_school_year?: number | null
          target_student_id?: string | null
          target_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_council_interventions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_interventions_origin_class_id_fkey"
            columns: ["origin_class_id"]
            isOneToOne: false
            referencedRelation: "class_council_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_interventions_origin_council_id_fkey"
            columns: ["origin_council_id"]
            isOneToOne: false
            referencedRelation: "class_councils"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_interventions_origin_enrollment_id_fkey"
            columns: ["origin_enrollment_id"]
            isOneToOne: false
            referencedRelation: "class_council_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_interventions_target_student_id_fkey"
            columns: ["target_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_interventions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_council_intervention_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          id: number
          intervention_id: string
          new_status: string
          previous_status: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: never
          intervention_id: string
          new_status: string
          previous_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: never
          intervention_id?: string
          new_status?: string
          previous_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_council_intervention_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_intervention_status_history_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "class_council_interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      class_council_participants: {
        Row: {
          council_class_id: string
          created_at: string
          created_by: string
          id: string
          name: string
          position: number
          role_or_subject: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          council_class_id: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          position?: number
          role_or_subject?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          council_class_id?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          position?: number
          role_or_subject?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_council_participants_council_class_id_fkey"
            columns: ["council_class_id"]
            isOneToOne: false
            referencedRelation: "class_council_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_participants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_participants_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_council_results: {
        Row: {
          absences: number | null
          created_at: string
          enrollment_id: string
          grade: number | null
          grade_marker: string | null
          id: string
          import_id: string
          subject_id: string
          term: number
        }
        Insert: {
          absences?: number | null
          created_at?: string
          enrollment_id: string
          grade?: number | null
          grade_marker?: string | null
          id?: string
          import_id: string
          subject_id: string
          term: number
        }
        Update: {
          absences?: number | null
          created_at?: string
          enrollment_id?: string
          grade?: number | null
          grade_marker?: string | null
          id?: string
          import_id?: string
          subject_id?: string
          term?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_council_results_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "class_council_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_results_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "class_council_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_results_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "class_council_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      class_council_student_snapshots: {
        Row: {
          attendance_rate: number | null
          created_at: string
          enrollment_id: string
          enrollment_status: string | null
          id: string
          import_id: string
          imported_name: string
          pcd_status: string | null
          race_color: string | null
          report_position: number | null
        }
        Insert: {
          attendance_rate?: number | null
          created_at?: string
          enrollment_id: string
          enrollment_status?: string | null
          id?: string
          import_id: string
          imported_name: string
          pcd_status?: string | null
          race_color?: string | null
          report_position?: number | null
        }
        Update: {
          attendance_rate?: number | null
          created_at?: string
          enrollment_id?: string
          enrollment_status?: string | null
          id?: string
          import_id?: string
          imported_name?: string
          pcd_status?: string | null
          race_color?: string | null
          report_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "class_council_student_snapshots_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "class_council_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_student_snapshots_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "class_council_imports"
            referencedColumns: ["id"]
          },
        ]
      }
      class_council_subjects: {
        Row: {
          council_class_id: string
          created_at: string
          created_by: string
          display_name: string
          id: string
          normalized_name: string
          teacher_name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          council_class_id: string
          created_at?: string
          created_by: string
          display_name: string
          id?: string
          normalized_name: string
          teacher_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          council_class_id?: string
          created_at?: string
          created_by?: string
          display_name?: string
          id?: string
          normalized_name?: string
          teacher_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_council_subjects_council_class_id_fkey"
            columns: ["council_class_id"]
            isOneToOne: false
            referencedRelation: "class_council_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_subjects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_council_subjects_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_councils: {
        Row: {
          archived_at: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string
          criteria: Json
          current_import_id: string | null
          id: string
          meeting_date: string
          offering: string
          school_year: number
          status: string
          term: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by: string
          criteria?: Json
          current_import_id?: string | null
          id?: string
          meeting_date: string
          offering: string
          school_year: number
          status?: string
          term: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string
          criteria?: Json
          current_import_id?: string | null
          id?: string
          meeting_date?: string
          offering?: string
          school_year?: number
          status?: string
          term?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_councils_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_councils_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_councils_current_import_belongs_to_council_fkey"
            columns: ["id", "current_import_id"]
            isOneToOne: false
            referencedRelation: "class_council_imports"
            referencedColumns: ["council_id", "id"]
          },
          {
            foreignKeyName: "class_councils_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_questions: {
        Row: {
          exam_id: string
          id: string
          position: number
          question_id: string
        }
        Insert: {
          exam_id: string
          id?: string
          position?: number
          question_id: string
        }
        Update: {
          exam_id?: string
          id?: string
          position?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          created_by: string | null
          date_label: string | null
          description: string | null
          duration: string | null
          grade: Database["public"]["Enums"]["grade_enum"] | null
          id: string
          instructions: string | null
          school_class: string | null
          school_name: string
          school_year: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_label?: string | null
          description?: string | null
          duration?: string | null
          grade?: Database["public"]["Enums"]["grade_enum"] | null
          id?: string
          instructions?: string | null
          school_class?: string | null
          school_name?: string
          school_year?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_label?: string | null
          description?: string | null
          duration?: string | null
          grade?: Database["public"]["Enums"]["grade_enum"] | null
          id?: string
          instructions?: string | null
          school_class?: string | null
          school_name?: string
          school_year?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_entries: {
        Row: {
          answer: string
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          keywords: string[]
          question: string
          updated_at: string
          usage_count: number
        }
        Insert: {
          answer: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          keywords: string[]
          question: string
          updated_at?: string
          usage_count?: number
        }
        Update: {
          answer?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          keywords?: string[]
          question?: string
          updated_at?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "faq_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pedagogical_risk_policies: {
        Row: {
          annual_required_points: number
          attendance_attention_threshold: number
          attendance_retention_threshold: number
          created_at: string
          created_by: string | null
          critical_required_average: number
          effective_from: string
          grade_1_2_attention_count: number
          grade_3_attention_count: number
          id: string
          partial_progression_limit: number
          pressure_required_average: number
          school_year: number
          source_reference: string | null
          term_expected_points: number
          updated_at: string
          version: number
        }
        Insert: {
          annual_required_points?: number
          attendance_attention_threshold?: number
          attendance_retention_threshold?: number
          created_at?: string
          created_by?: string | null
          critical_required_average?: number
          effective_from: string
          grade_1_2_attention_count?: number
          grade_3_attention_count?: number
          id?: string
          partial_progression_limit?: number
          pressure_required_average?: number
          school_year: number
          source_reference?: string | null
          term_expected_points?: number
          updated_at?: string
          version?: number
        }
        Update: {
          annual_required_points?: number
          attendance_attention_threshold?: number
          attendance_retention_threshold?: number
          created_at?: string
          created_by?: string | null
          critical_required_average?: number
          effective_from?: string
          grade_1_2_attention_count?: number
          grade_3_attention_count?: number
          id?: string
          partial_progression_limit?: number
          pressure_required_average?: number
          school_year?: number
          source_reference?: string | null
          term_expected_points?: number
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedagogical_risk_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_admin_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: number
          new_values: Json
          old_values: Json
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: never
          new_values?: Json
          old_values?: Json
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: never
          new_values?: Json
          old_values?: Json
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_admin_audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_admin_audit_log_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          answer: string
          created_at: string
          deleted_at: string | null
          difficulty: string | null
          id: string
          image_url: string | null
          knowledge_area: string
          level: string | null
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          option_e: string
          statement: string
          subject: string
          teacher_name: string | null
          topic: string | null
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          deleted_at?: string | null
          difficulty?: string | null
          id?: string
          image_url?: string | null
          knowledge_area: string
          level?: string | null
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          option_e: string
          statement: string
          subject: string
          teacher_name?: string | null
          topic?: string | null
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          deleted_at?: string | null
          difficulty?: string | null
          id?: string
          image_url?: string | null
          knowledge_area?: string
          level?: string | null
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          option_e?: string
          statement?: string
          subject?: string
          teacher_name?: string | null
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      school_occurrence_students: {
        Row: {
          class_name: string | null
          class_official_code: string | null
          created_at: string
          occurrence_id: string
          student_id: string
        }
        Insert: {
          class_name?: string | null
          class_official_code?: string | null
          created_at?: string
          occurrence_id: string
          student_id: string
        }
        Update: {
          class_name?: string | null
          class_official_code?: string | null
          created_at?: string
          occurrence_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_occurrence_students_occurrence_id_fkey"
            columns: ["occurrence_id"]
            isOneToOne: false
            referencedRelation: "school_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_occurrence_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      school_occurrences: {
        Row: {
          category: string
          class_name: string | null
          class_official_code: string | null
          created_at: string
          created_by: string
          guardian_notified: boolean
          id: string
          notes: string | null
          occurred_on: string
          school_year: number
          student_id: string | null
          target_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category: string
          class_name?: string | null
          class_official_code?: string | null
          created_at?: string
          created_by: string
          guardian_notified?: boolean
          id?: string
          notes?: string | null
          occurred_on: string
          school_year: number
          student_id?: string | null
          target_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string
          class_name?: string | null
          class_official_code?: string | null
          created_at?: string
          created_by?: string
          guardian_notified?: boolean
          id?: string
          notes?: string | null
          occurred_on?: string
          school_year?: number
          student_id?: string | null
          target_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_occurrences_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_occurrences_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_occurrences_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_situation_history: {
        Row: {
          changed_at: string
          changed_by: string
          id: number
          new_situation: string
          previous_situation: string
          student_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: never
          new_situation: string
          previous_situation: string
          student_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: never
          new_situation?: string
          previous_situation?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_situation_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_situation_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          canonical_name: string
          created_at: string
          current_situation: string
          enrollment_number: string
          id: string
          situation_updated_at: string | null
          situation_updated_by: string | null
          updated_at: string
        }
        Insert: {
          canonical_name: string
          created_at?: string
          current_situation?: string
          enrollment_number: string
          id?: string
          situation_updated_at?: string | null
          situation_updated_by?: string | null
          updated_at?: string
        }
        Update: {
          canonical_name?: string
          created_at?: string
          current_situation?: string
          enrollment_number?: string
          id?: string
          situation_updated_at?: string | null
          situation_updated_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_situation_updated_by_fkey"
            columns: ["situation_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_collective_school_occurrence: {
        Args: {
          p_actor_id: string
          p_category: string
          p_guardian_notified: boolean
          p_notes: string | null
          p_occurred_on: string
          p_school_year: number
          p_students: Json
        }
        Returns: string
      }
      is_active_staff: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      list_school_occurrence_years: {
        Args: never
        Returns: { school_year: number }[]
      }
      list_student_occurrence_summaries: {
        Args: {
          p_school_year?: number | null
          p_student_ids?: string[] | null
        }
        Returns: {
          latest_category: string
          latest_occurred_on: string
          occurrence_count: number
          student_id: string
        }[]
      }
      set_student_current_situation: {
        Args: {
          p_actor_id: string
          p_situation: string
          p_student_id: string
        }
        Returns: undefined
      }
      replace_class_council_participants: {
        Args: {
          p_actor_id: string
          p_class_id: string
          p_council_id: string
          p_participants: Json
        }
        Returns: undefined
      }
      reopen_class_council_class: {
        Args: {
          p_actor_id: string
          p_class_id: string
          p_council_id: string
        }
        Returns: boolean
      }
      start_class_council_class: {
        Args: {
          p_actor_id: string
          p_class_id: string
          p_council_id: string
          p_teachers: Json
        }
        Returns: boolean
      }
    }
    Enums: {
      grade_enum: "1ª Série" | "2ª Série" | "3ª Série" | "EJA"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      grade_enum: ["1ª Série", "2ª Série", "3ª Série", "EJA"],
    },
  },
} as const
