"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { 
  Search, 
  Calendar, 
  Clock, 
  User, 
  GraduationCap, 
  Sparkles, 
  LayoutGrid, 
  List, 
  Info,
  CalendarCheck
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// DATA TYPES AND CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

type Turno = "Manhã" | "Tarde" | "Noite";
type DiaDaSemana =
  | "Segunda"
  | "Terça"
  | "Quarta"
  | "Quinta"
  | "Sexta"
  | "Sábado";

interface EntradaCronograma {
  id: string;
  professor: string;
  turma: string;
  dia: DiaDaSemana;
  turno: Turno;
  horario: string;
}

const CRONOGRAMA: EntradaCronograma[] = [
  // Segunda-feira
  {
    id: "1",
    professor: "Andréia Lúcia da Silva Firmino",
    turma: "3TC",
    dia: "Segunda",
    turno: "Noite",
    horario: "19:00 – 22:00"
  },
  {
    id: "2",
    professor: "Liane Melo Lima",
    turma: "1TA",
    dia: "Segunda",
    turno: "Manhã",
    horario: "07:30 – 11:30"
  },
  {
    id: "3",
    professor: "VALDIR SALGUEIRO",
    turma: "3TE",
    dia: "Segunda",
    turno: "Manhã",
    horario: "07:30 – 11:30"
  },

  // Terça-feira
  {
    id: "4",
    professor: "Maria José da Silva Martins",
    turma: "3TD",
    dia: "Terça",
    turno: "Manhã",
    horario: "07:30 – 11:30"
  },
  {
    id: "5",
    professor: "Ricleuma Maria Ferreira Mota",
    turma: "1MD",
    dia: "Terça",
    turno: "Tarde",
    horario: "13:30 – 17:30"
  },

  // Quarta-feira
  {
    id: "6",
    professor: "Rhaisa Lima Nunes",
    turma: "1MB",
    dia: "Quarta",
    turno: "Tarde",
    horario: "13:30 – 17:30"
  },

  // Quinta-feira
  {
    id: "7",
    professor: "Mateus da Cunha Santos",
    turma: "3MB",
    dia: "Quinta",
    turno: "Noite",
    horario: "19:00 – 22:00"
  },
  {
    id: "8",
    professor: "Airton Santos Alves",
    turma: "3TA",
    dia: "Quinta",
    turno: "Noite",
    horario: "19:00 – 22:00"
  },
  {
    id: "9",
    professor: "Marilene dos Santos",
    turma: "3MA",
    dia: "Quinta",
    turno: "Tarde",
    horario: "13:30 – 17:30"
  },
  {
    id: "10",
    professor: "Delano Santos Martins",
    turma: "3MC",
    dia: "Quinta",
    turno: "Noite",
    horario: "19:00 – 22:00"
  },
  {
    id: "11",
    professor: "Arlan Oliveira da Silva",
    turma: "1MA",
    dia: "Quinta",
    turno: "Noite",
    horario: "19:00 – 22:00"
  },
  {
    id: "12",
    professor: "Cley Erickson Silva Xavier",
    turma: "3TB",
    dia: "Quinta",
    turno: "Manhã",
    horario: "07:30 – 11:30"
  },

  // Sexta-feira
  {
    id: "13",
    professor: "José Wilson Cardoso Galdino",
    turma: "1TC",
    dia: "Sexta",
    turno: "Manhã",
    horario: "07:30 – 11:30"
  },

  // Sábado
  {
    id: "14",
    professor: "Jônatas Ferro Cavalcante",
    turma: "1TB",
    dia: "Sábado",
    turno: "Manhã",
    horario: "07:30 – 11:30"
  },
];

const DIAS_DA_SEMANA: DiaDaSemana[] = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

const TURNOS: Turno[] = ["Manhã", "Tarde", "Noite"];

const TURNO_CONFIG: Record<
  Turno,
  { 
    cor: string; 
    corTexto: string; 
    corBadge: string; 
    emoji: string; 
    borderHex: string;
  }
> = {
  Manhã: {
    cor: "bg-amber-50/60 border-amber-200 hover:border-amber-300 hover:bg-amber-50/80",
    corTexto: "text-amber-800",
    corBadge: "bg-amber-100/70 border-amber-200 text-amber-900",
    emoji: "🌅",
    borderHex: "rgba(245, 158, 11, 0.25)"
  },
  Tarde: {
    cor: "bg-sky-50/60 border-sky-200 hover:border-sky-300 hover:bg-sky-50/80",
    corTexto: "text-sky-800",
    corBadge: "bg-sky-100/70 border-sky-200 text-sky-900",
    emoji: "☀️",
    borderHex: "rgba(14, 165, 233, 0.25)"
  },
  Noite: {
    cor: "bg-indigo-50/60 border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50/80",
    corTexto: "text-indigo-850",
    corBadge: "bg-indigo-100/70 border-indigo-200 text-indigo-900",
    emoji: "🌙",
    borderHex: "rgba(139, 92, 246, 0.25)"
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL (FUNDO CLARO PREMIUM)
// ─────────────────────────────────────────────────────────────────────────────

export default function RecomposicaoPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTurnFilter, setActiveTurnFilter] = useState<Turno | "Todos">("Todos");
  const [activeDayFilter, setActiveDayFilter] = useState<DiaDaSemana | "Todos">("Todos");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Filtrar dados com base nas interações
  const filteredCronograma = useMemo(() => {
    return CRONOGRAMA.filter((item) => {
      const matchesSearch = 
        item.professor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.turma.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTurn = activeTurnFilter === "Todos" || item.turno === activeTurnFilter;
      const matchesDay = activeDayFilter === "Todos" || item.dia === activeDayFilter;

      return matchesSearch && matchesTurn && matchesDay;
    });
  }, [searchTerm, activeTurnFilter, activeDayFilter]);

  // Estatísticas rápidas
  const stats = useMemo(() => {
    const totalMentores = new Set(CRONOGRAMA.map(i => i.professor)).size;
    const totalTurmas = new Set(CRONOGRAMA.map(i => i.turma)).size;
    const manhaCount = CRONOGRAMA.filter(i => i.turno === "Manhã").length;
    const tardeCount = CRONOGRAMA.filter(i => i.turno === "Tarde").length;
    const noiteCount = CRONOGRAMA.filter(i => i.turno === "Noite").length;

    return { totalMentores, totalTurmas, manhaCount, tardeCount, noiteCount };
  }, []);

  // Agrupamento por Dia e Turno
  const porDia = useMemo(() => {
    return DIAS_DA_SEMANA.reduce<
      Record<DiaDaSemana, Record<Turno, EntradaCronograma[]>>
    >((acc, dia) => {
      acc[dia] = {
        Manhã: filteredCronograma.filter((e) => e.dia === dia && e.turno === "Manhã"),
        Tarde: filteredCronograma.filter((e) => e.dia === dia && e.turno === "Tarde"),
        Noite: filteredCronograma.filter((e) => e.dia === dia && e.turno === "Noite"),
      };
      return acc;
    }, {} as Record<DiaDaSemana, Record<Turno, EntradaCronograma[]>>);
  }, [filteredCronograma]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setActiveTurnFilter("Todos");
    setActiveDayFilter("Todos");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 text-slate-800 antialiased font-sans pb-20 relative selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Detalhes artísticos de iluminação (fundo claro) */}
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-emerald-100/20 via-emerald-50/5 to-transparent pointer-events-none" />
      
      {/* ── HEADER GLASS ── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-slate-200/80 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-1 bg-slate-50 rounded-xl shadow-inner border border-slate-200/40">
              <Image
                src="/logo_escola.png"
                alt="Logo da Escola"
                width={48}
                height={48}
                className="object-contain shrink-0"
              />
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="p-1 bg-white rounded-xl shadow-sm border border-slate-100">
              <Image
                src="/logo-mentor.png"
                alt="Professor Mentor"
                width={120}
                height={38}
                className="object-contain shrink-0"
              />
            </div>
          </div>

          <div className="text-center md:text-right">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900 flex items-center justify-center md:justify-end gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600 animate-pulse" />
              Cronograma de Recomposição
            </h1>
            <p className="text-sm text-slate-500 font-semibold mt-0.5">
              Programa Professor Mentor · Consulta Pública
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        
        {/* ── PAINEL DE ESTATÍSTICAS ── */}
        <section className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 mb-8">
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 flex items-center gap-4 transition-all hover:shadow-md hover:bg-white">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Mentores</p>
              <h3 className="text-lg font-black text-slate-950 leading-none mt-1">{stats.totalMentores}</h3>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 flex items-center gap-4 transition-all hover:shadow-md hover:bg-white">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Turmas</p>
              <h3 className="text-lg font-black text-slate-950 leading-none mt-1">{stats.totalTurmas}</h3>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 flex items-center gap-3 transition-all hover:shadow-md hover:bg-white">
            <span className="text-xl">🌅</span>
            <div>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Manhã</p>
              <h3 className="text-lg font-black text-slate-950 leading-none mt-1">{stats.manhaCount} Aulas</h3>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 flex items-center gap-3 transition-all hover:shadow-md hover:bg-white">
            <span className="text-xl">☀️</span>
            <div>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Tarde</p>
              <h3 className="text-lg font-black text-slate-950 leading-none mt-1">{stats.tardeCount} Aulas</h3>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 col-span-2 lg:col-span-1 flex items-center justify-center lg:justify-start gap-3 transition-all hover:shadow-md hover:bg-white">
            <span className="text-xl">🌙</span>
            <div>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Noite</p>
              <h3 className="text-lg font-black text-slate-950 leading-none mt-1">{stats.noiteCount} Aulas</h3>
            </div>
          </div>
        </section>

        {/* ── PAINEL DE CONTROLES E FILTROS ── */}
        <section className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm mb-8">
          <div className="flex flex-col gap-6">
            
            {/* Input de Busca e Botão de Layout */}
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              
              {/* Busca */}
              <div className="w-full lg:w-96 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por professor ou turma..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
                />
              </div>

              {/* Botões alternadores de visão */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 w-full lg:w-auto justify-center">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                    viewMode === "grid" 
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/40" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  Grade Semanal
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                    viewMode === "list" 
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/40" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  Lista Completa
                </button>
              </div>
            </div>

            {/* Linha secundária de Filtros Avançados */}
            <div className="flex flex-wrap gap-6 items-center border-t border-slate-100 pt-5">
              
              {/* Turno */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Filtrar Turno:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setActiveTurnFilter("Todos")}
                    className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all border ${
                      activeTurnFilter === "Todos"
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-slate-50 text-slate-650 border-slate-200 hover:border-slate-350 hover:bg-slate-100"
                    }`}
                  >
                    Todos
                  </button>
                  {TURNOS.map((turno) => {
                    const cfg = TURNO_CONFIG[turno];
                    const active = activeTurnFilter === turno;
                    return (
                      <button
                        key={turno}
                        onClick={() => setActiveTurnFilter(turno)}
                        className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all border flex items-center gap-1 ${
                          active
                            ? `bg-slate-900 text-white border-slate-900 shadow-sm`
                            : `bg-slate-50 text-slate-650 border-slate-200 hover:bg-slate-100`
                        }`}
                      >
                        <span>{cfg.emoji}</span>
                        <span>{turno}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dia da Semana */}
              <div className="flex flex-col gap-2">
                <span className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Filtrar Dia:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => setActiveDayFilter("Todos")}
                    className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all border ${
                      activeDayFilter === "Todos"
                        ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                        : "bg-slate-50 text-slate-650 border-slate-200 hover:border-slate-350 hover:bg-slate-100"
                    }`}
                  >
                    Todos
                  </button>
                  {DIAS_DA_SEMANA.map((dia) => {
                    const active = activeDayFilter === dia;
                    return (
                      <button
                        key={dia}
                        onClick={() => setActiveDayFilter(dia)}
                        className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all border ${
                          active
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                            : "bg-slate-50 text-slate-650 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {dia}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Resetar Filtros */}
              {(searchTerm || activeTurnFilter !== "Todos" || activeDayFilter !== "Todos") && (
                <button
                  onClick={handleClearFilters}
                  className="ml-auto px-4 py-2 text-sm font-bold text-emerald-700 hover:text-emerald-800 border border-emerald-250 hover:border-emerald-350 bg-emerald-50 rounded-xl transition-all shadow-sm"
                >
                  Limpar Filtros
                </button>
              )}
            </div>

          </div>
        </section>

        {/* ── INTERFACE DE DADOS ── */}
        
        {filteredCronograma.length === 0 ? (
          /* Estado Vazio */
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-200/50">
              <Info className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-slate-800">Nenhum horário localizado</h4>
            <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">
              Não encontramos aulas com as pesquisas e filtros informados. Tente ajustar os termos de busca ou clique abaixo para redefinir.
            </p>
            <button
              onClick={handleClearFilters}
              className="mt-6 px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-600/10 hover:bg-emerald-500 transition-all"
            >
              Exibir Todos os Horários
            </button>
          </div>
        ) : viewMode === "grid" ? (
          
          /* MODO GRADE SEMANAL CLARA */
          <div className="bg-white/60 border border-slate-200/75 rounded-3xl p-4 sm:p-6 shadow-sm">
            <div className="overflow-x-auto pb-4">
              <div
                className="grid gap-6"
                style={{
                  gridTemplateColumns: `repeat(${DIAS_DA_SEMANA.length}, minmax(240px, 1fr))`,
                  minWidth: `${DIAS_DA_SEMANA.length * 250}px`,
                }}
              >
                {/* Cabeçalhos de Dias */}
                {DIAS_DA_SEMANA.map((dia) => {
                  const itemsOnDay = filteredCronograma.filter((e) => e.dia === dia).length;
                  const isFilteredOut = activeDayFilter !== "Todos" && activeDayFilter !== dia;
                  
                  return (
                    <div
                      key={dia}
                      className={`rounded-2xl px-4 py-4 text-center border transition-all ${
                        isFilteredOut 
                          ? "bg-slate-100/30 border-slate-100 opacity-40" 
                          : "bg-slate-900 border-slate-900 text-white shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <CalendarCheck className={`w-4 h-4 ${isFilteredOut ? "text-slate-400" : "text-emerald-400"}`} />
                        <span className="font-extrabold text-sm tracking-wide uppercase">{dia}</span>
                      </div>
                      {itemsOnDay > 0 ? (
                        <span className={`inline-flex mt-1.5 px-2.5 py-0.5 rounded-full text-sm font-bold ${isFilteredOut ? "bg-slate-100 text-slate-600" : "bg-white/10 text-emerald-300 border border-white/10"}`}>
                          {itemsOnDay} {itemsOnDay === 1 ? "aula" : "aulas"}
                        </span>
                      ) : (
                        <p className="text-sm text-slate-400 font-medium mt-1.5">Sem programação</p>
                      )}
                    </div>
                  );
                })}

                {/* Colunas de Aulas */}
                {DIAS_DA_SEMANA.map((dia) => {
                  const hasLessons = TURNOS.some((t) => porDia[dia][t].length > 0);
                  const isFilteredOut = activeDayFilter !== "Todos" && activeDayFilter !== dia;
                  
                  return (
                    <div 
                      key={dia} 
                      className={`flex flex-col gap-4 transition-all duration-300 ${
                        isFilteredOut ? "opacity-35 blur-[0.2px] pointer-events-none" : ""
                      }`}
                    >
                      {TURNOS.map((turno) => {
                        const entradas = porDia[dia][turno];
                        if (entradas.length === 0) return null;
                        const cfg = TURNO_CONFIG[turno];

                        return (
                          <div
                            key={turno}
                            className={`rounded-2xl border p-4 shadow-sm ${cfg.cor} flex flex-col gap-3 transition-all duration-300 hover:shadow-md`}
                            style={{ borderColor: cfg.borderHex }}
                          >
                            {/* Banner do Turno */}
                            <div className="flex items-center justify-between border-b border-black/5 pb-2">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-sm font-extrabold border ${cfg.corBadge}`}
                              >
                                {cfg.emoji} {turno}
                              </span>
                              <div className="flex items-center gap-1 text-sm font-bold text-slate-500 font-mono">
                                <Clock className="w-3 h-3 text-slate-400" />
                                {entradas[0].horario}
                              </div>
                            </div>

                            {/* Detalhes dos Professores */}
                            <div className="flex flex-col gap-2">
                              {entradas.map((entrada) => (
                                <div
                                  key={entrada.id}
                                  className="bg-white border border-slate-150 rounded-xl p-3 flex flex-col gap-2 shadow-sm hover:border-slate-350 transition-all duration-200"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <h4 className="text-sm font-bold text-slate-805 leading-snug">
                                      {entrada.professor}
                                    </h4>
                                    <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-md text-sm font-extrabold bg-green-50 text-green-700 border border-green-200/60 uppercase tracking-wide">
                                      {entrada.turma}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* Dia Livre */}
                      {!hasLessons && (
                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-8 px-4 text-center flex flex-col items-center justify-center">
                          <p className="text-sm text-slate-400 font-bold">Livre</p>
                          <p className="text-sm text-slate-400 mt-1">Sem atividades</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Ajuda Mobile */}
            <div className="mt-4 flex items-center justify-center gap-2 text-slate-400 text-sm font-medium sm:hidden">
              <span>← Deslize lateralmente para ver a semana →</span>
            </div>
          </div>
        ) : (
          
          /* MODO TABELA COMPLETA CLARA */
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-4 text-sm font-extrabold text-slate-500 uppercase tracking-wider">
                      Professor Mentor
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-extrabold text-slate-500 uppercase tracking-wider">
                      Turma
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-extrabold text-slate-500 uppercase tracking-wider">
                      Dia
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-extrabold text-slate-500 uppercase tracking-wider">
                      Turno
                    </th>
                    <th className="text-left px-6 py-4 text-sm font-extrabold text-slate-500 uppercase tracking-wider">
                      Horário Presencial
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCronograma
                    .sort((a, b) => {
                      const diaOrder = DIAS_DA_SEMANA.indexOf(a.dia) - DIAS_DA_SEMANA.indexOf(b.dia);
                      if (diaOrder !== 0) return diaOrder;
                      return TURNOS.indexOf(a.turno) - TURNOS.indexOf(b.turno);
                    })
                    .map((entrada) => {
                      const cfg = TURNO_CONFIG[entrada.turno];
                      return (
                        <tr
                          key={entrada.id}
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-700 transition-all border border-slate-200/50">
                                {entrada.professor.charAt(0)}
                              </div>
                              <span className="font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">
                                {entrada.professor}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-sm font-extrabold bg-green-50 text-green-700 border border-green-200/50">
                              {entrada.turma}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-700">
                            {entrada.dia}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border ${cfg.corBadge}`}
                            >
                              <span>{cfg.emoji}</span>
                              <span>{entrada.turno}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-sm text-slate-600 font-mono font-bold">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {entrada.horario}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── AVISOS DE DIRETRIZES ── */}
        <section className="mt-10 bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start gap-4 max-w-4xl mx-auto">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 border border-emerald-100">
            <Info className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-900">Importante: Diretrizes do Programa</h4>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              O cronograma acima exibe a disponibilidade presencial semanal (de 2 horas) dedicada ao Programa Professor Mentor. 
              Assegure-se de que os horários de estudos da sua turma ou suas aulas regulares em outras salas não coincidam com os slots indicados no painel.
            </p>
          </div>
        </section>

      </div>

      {/* ── FOOTER CLARO ── */}
      <footer className="border-t border-slate-200 bg-white/70 mt-20 py-8 text-center text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-bold text-slate-800">
            FélixHub · Plataforma de Gestão Integrada
          </p>
          <p className="text-sm text-slate-400 font-medium">
            Todos os direitos reservados &copy; {new Date().getFullYear()} · Desenvolvido por Misael Lima
          </p>
        </div>
      </footer>
    </main>
  );
}
