 // middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_FILE = /\.(.*)$/;
const PREFIXES = ['/main', '/hub'];
const PUBLIC_HUB_PATHS = [
  '/hub/professor-mentor/gerar-folha-de-frequencia',
  '/hub/professor-mentor/recomposicao',
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

  if (PUBLIC_HUB_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  // Conselho de Classe nunca aceita a sessão isolada de professor.
  if ((pathname === '/hub/conselhos' || pathname.startsWith('/hub/conselhos/')) && !req.cookies.has('sb_access_token')) {
    const loginUrl = new URL('/hub/login', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3) Hostname sem porta e subdomínio
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

  // 4) Proteção das rotas do professor (hub)
  const cleanPath = pathname.startsWith('/hub/') ? pathname.replace('/hub', '') : pathname;
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

  // 5) Evita reescrever novamente se já estamos num prefixo conhecido
  if (PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  // 6) Mapeia subdomínio -> prefixo para o rewrite
  const prefix =
    sub === 'hub' ? '/hub' :
    '/main';

  // 7) Reescreve preservando caminho e querystring
  return NextResponse.rewrite(new URL(`${prefix}${pathname}${search}`, req.url));
}

export const config = {
  matcher: [
    // Roda em tudo, exceto internos do Next, arquivos com extensão e rotas de API
    '/((?!_next/|api/|.*\\..*).*)',
  ],
};
