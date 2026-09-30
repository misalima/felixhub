// ============================================================
// Constantes centralizadas para o site institucional
// Escola Estadual Professor José Félix de Carvalho Alves
// ============================================================

export const SCHOOL_NAME =
  "Escola Estadual Professor José Félix de Carvalho Alves";
export const SCHOOL_SHORT_NAME = "E.E. Prof. José Félix";
export const SCHOOL_LOCATION = "São Sebastião – AL";
export const SCHOOL_MOTTO = "Scientia Potentia Est";

// ── Números ──────────────────────────────────────────────────
export const SCHOOL_STATS = [
  { id: "alunos", value: 800, suffix: "+", label: "Alunos" },
  { id: "professores", value: 30, suffix: "+", label: "Professores" },
  { id: "historia", value: 75, suffix: "+", label: "Anos de história" },
  { id: "turnos", value: 3, suffix: "", label: "Turnos" },
] as const;

// ── Estrutura ─────────────────────────────────────────────────
export const SCHOOL_FACILITIES = [
  { id: "salas", label: "9 Salas de aula climatizadas", icon: "DoorOpen" },
  { id: "biblioteca", label: "Biblioteca", icon: "BookOpen" },
  { id: "aee", label: "Sala de AEE", icon: "Accessibility" },
  { id: "gremio", label: "Sala do Grêmio", icon: "Users" },
  { id: "lab", label: "Laboratório de Informática Móvel", icon: "Laptop" },
] as const;

// ── Projetos ─────────────────────────────────────────────────
export const SCHOOL_PROJECTS = [
  {
    id: "fesmatecc",
    title: "FESMATECC",
    subtitle: "Feira de Ciências e Cultura",
    description:
      "Interdisciplinaridade e protagonismo estudantil através da investigação científica e expressão cultural.",
    icon: "FlaskConical",
    badge: "Ciência & Cultura",
  },
  {
    id: "protagonismo",
    title: "Protagonismo Juvenil",
    subtitle: "Grêmio Estudantil",
    description:
      "Fortalecimento da liderança e participação democrática dos estudantes na vida escolar.",
    icon: "Users2",
    badge: "Liderança",
  },
  {
    id: "inclusao",
    title: "Inclusão e Diversidade",
    subtitle: "Educação Especial e Cultura Local",
    description:
      "Valorização da educação especial e das tradições regionais como a renda de bilro.",
    icon: "Heart",
    badge: "Inclusão",
  },
] as const;

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatarInitials: string;
  avatarSrc: string;
}

export const SCHOOL_TEAM: readonly TeamMember[] = [
  {
    id: "gestor-1",
    name: "Geyvison Soares",
    role: "Gestor Geral",
    avatarInitials: "GS",
    avatarSrc: "/team/gestor-geral.png",
  },
  {
    id: "gestor-2",
    name: "Luiz Almeida",
    role: "Gestor Adjunto",
    avatarInitials: "LA",
    avatarSrc: "/team/gestor-adjunto.png",
  },
  {
    id: "coord-1",
    name: "Misael Lima",
    role: "Coordenador Pedagógico",
    avatarInitials: "ML",
    avatarSrc: "/team/coordenador-1.png",
  },
  {
    id: "coord-2",
    name: "Valdir Salgueiro",
    role: "Coordenador Pedagógico",
    avatarInitials: "VS",
    avatarSrc: "/team/coordenador-2.png",
  },
  {
    id: "secretaria",
    name: "Eliana Ferreira",
    role: "Secretaria Escolar",
    avatarInitials: "EF",
    avatarSrc: "/team/secretary.png",
  },
] as const;

// ── Contato ───────────────────────────────────────────────────
export const SCHOOL_CONTACT = {
  address: "Rua Pedro Vieira de Barros, S/N, Centro — Próximo à Prefeitura Municipal, São Sebastião – AL",
  phone: "(82) 99913-7086",
  email: "ee.josefelix@educ.al.gov.br",
  instagramUrl: "https://instagram.com/eeprofjosefelix",
  whatsappUrl: "https://wa.me/5582999137086",
} as const;

// ── Navegação ─────────────────────────────────────────────────
export const NAV_LINKS = [
  { label: "Início", href: "#home" },
  { label: "Sobre", href: "#about" },
  { label: "Números", href: "#numbers" },
  { label: "Estrutura", href: "#facilities" },
  { label: "Projetos", href: "#projects" },
  { label: "Equipe", href: "#team" },
  { label: "Contato", href: "#contact" },
] as const;
