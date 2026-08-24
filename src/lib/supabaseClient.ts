import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Custom fetch wrapper that catches network/paused errors and converts them to graceful 503 responses.
// This prevents uncaught 'Failed to fetch' TypeError exceptions from bubbling up and crashing the app.
const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  try {
    return await fetch(input, init);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Supabase Client] Custom fetch caught network error (offline or paused):", error);
    return new Response(
      JSON.stringify({
        error: "network_error",
        message: "Failed to connect to Supabase. The project may be paused or offline.",
      }),
      {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

// Check if we are loading the page on a public path
const isPublicPath = () => {
  if (typeof window === 'undefined') return false;
  const pathname = window.location.pathname;
  const publicPaths = [
    '/hub/professor-mentor/gerar-folha-de-frequencia',
    '/hub/professor-mentor/recomposicao'
  ];
  return publicPaths.some(path => pathname === path || pathname.startsWith(`${path}/`));
};

const publicRoute = isPublicPath();

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    autoRefreshToken: !publicRoute,
    persistSession: !publicRoute,
    detectSessionInUrl: !publicRoute,
  },
  global: {
    fetch: customFetch,
  },
});
