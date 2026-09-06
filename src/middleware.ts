 // middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_FILE = /\.(.*)$/;
const PREFIXES = ['/main', '/hub'];
const PUBLIC_HUB_PATHS = [
  '/hub/professor-mentor/gerar-folha-de-frequencia',
  '/hub/professor-mentor/recomposicao',
];
const STAFF_PROTECTED_PATHS = [
  '/hub/conselhos',
  '/hub/dashboard',
  '/hub/alunos',
  '/hub/ocorrencias',
  '/hub/relatorios',
];

// Rotas do professor que exigem cookie teacher_session válido
const TEACHER_PROTECTED_PATHS = [
  '/simulados/professor/nova-questao',
  '/simulados/questoes/resumo'
];

import { validateTeacherSession } from '@/lib/authTeacherEdge';

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const { pathname, search } = url;

  // 1) Ignora assets e internos do Next
  if (PUBLIC_FILE.test(pathname) || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  // 2) Hostname sem porta e subdomínio
  const hostHeader = req.headers.get('host') ?? '';
  const hostname = hostHeader.split(':')[0].toLowerCase();
  
  let sub = '';
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
    if (url.searchParams.has('sub')) sub = url.searchParams.get('sub') ?? '';
  } else if (hostname.endsWith('.nip.io') || hostname.endsWith('.sslip.io')) {
    sub = hostname.split('.')[0];
  } else {
    const parts = hostname.split('.');
    sub = parts[0] === 'www' ? '' : (parts.length > 2 ? parts[0] : '');
  }

  // No subdomínio do Hub, /hub é apenas um detalhe interno da aplicação.
  // Mantemos uma única URL pública limpa: hub.dominio.com/alunos, por exemplo.
  if (sub === 'hub' && (pathname === '/hub' || pathname.startsWith('/hub/'))) {
    const cleanPathname = pathname === '/hub' ? '/' : pathname.slice('/hub'.length);
    return NextResponse.redirect(new URL(`${cleanPathname}${search}`, req.url), 308);
  }

  const routedPath = sub === 'hub'
    ? `/hub${pathname === '/' ? '' : pathname}`
    : pathname;

  // Rotas públicas já prefixadas funcionam no domínio principal. No subdomínio,
  // a rota limpa ainda precisa seguir até o rewrite no fim do middleware.
  if (sub !== 'hub' && PUBLIC_HUB_PATHS.some((path) => routedPath === path || routedPath.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  // Áreas pedagógicas nunca aceitam a sessão isolada de professor.
  if (STAFF_PROTECTED_PATHS.some((path) => routedPath === path || routedPath.startsWith(`${path}/`)) && !req.cookies.has('sb_access_token')) {
    const loginUrl = new URL(sub === 'hub' ? '/login' : '/hub/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3) Proteção das rotas do professor (hub)
  const cleanPath = routedPath.startsWith('/hub/') ? routedPath.slice('/hub'.length) : routedPath;
  const isTeacherProtected = TEACHER_PROTECTED_PATHS.some((p) => cleanPath === p || cleanPath.startsWith(`${p}/`));

  if (isTeacherProtected) {
    const token = req.cookies.get('teacher_session')?.value;
    const valid = await validateTeacherSession(token);
    const hasSupabase = req.cookies.has('sb_access_token');
    
    if (!valid && !hasSupabase) {
      // Se for subdomínio, redireciona para /simulados/professor na raiz do subdomínio
      // Se for subpasta, redireciona para /hub/simulados/professor
      const redirectBase = sub === 'hub' ? '' : '/hub';
      const redirectUrl = new URL(`${redirectBase}/simulados/professor${search}`, req.url);
      redirectUrl.searchParams.set('redirect', cleanPath);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 4) Evita reescrever novamente se já estamos num prefixo conhecido
  if (PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  // 5) Mapeia subdomínio -> prefixo para o rewrite
  const prefix =
    sub === 'hub' ? '/hub' :
    '/main';

  // 6) Reescreve preservando caminho e querystring
  return NextResponse.rewrite(new URL(`${prefix}${pathname}${search}`, req.url));
}

export const config = {
  matcher: [
    // Roda em tudo, exceto internos do Next, arquivos com extensão e rotas de API
    '/((?!_next/|api/|.*\\..*).*)',
  ],
};
