import Image from "next/image";
import { SCHOOL_NAME } from "@/constants/main/school";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      className="bg-[#1a3a6b] text-white"
      role="contentinfo"
      aria-label="Rodapé do site"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white flex-shrink-0">
              <Image
                src="/logo_escola.png"
                alt="Logo da Escola Estadual Professor José Félix de Carvalho Alves"
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">{SCHOOL_NAME}</p>
              <p className="text-blue-200 text-sm leading-tight mt-0.5">
                São Sebastião – AL
              </p>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center md:text-right text-sm text-blue-200">
            <p>© {year} {SCHOOL_NAME}</p>
            <p className="mt-1 text-blue-300 text-sm">
              Desenvolvido por{" "}
              <a
                href="https://github.com/misalima"
                target="_blank"
                rel="noopener noreferrer"
                className="text-yellow-400 hover:text-yellow-300 transition-colors font-medium underline underline-offset-2"
                aria-label="Link para o perfil de Misael Lima no GitHub (abre em nova aba)"
              >
                Misael Lima
              </a>
            </p>
          </div>
        </div>

        <div
          className="mt-8 pt-6 border-t border-blue-700/50 text-center text-sm text-blue-400"
          aria-hidden="true"
        >
          Vinculada à SEDUC/AL · 5ª GEE – Arapiraca
        </div>
      </div>
    </footer>
  );
}
