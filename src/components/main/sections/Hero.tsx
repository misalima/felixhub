"use client";

import { Button } from "@/components/ui/button";
import { SCHOOL_NAME, SCHOOL_LOCATION } from "@/constants/main/school";

export function Hero() {
  const handleScroll = (href: string) => {
    const target = document.querySelector(href);
    if (target) {
      const yOffset = -72;
      const y =
        target.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <section
      id="inicio"
      aria-label="Seção principal"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-[#0d2340] via-[#1a3a6b] to-[#0a1b33]"
        aria-hidden="true"
      />

      {/* Decorative circles */}
      <div
        className="absolute top-0 right-0 w-[500px] h-[500px] bg-yellow-500/5 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-80 h-80 bg-yellow-400/10 rounded-full translate-y-1/3 -translate-x-1/3 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-32">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-yellow-400/20 border border-yellow-400/30 text-yellow-300 text-sm font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-8 backdrop-blur-sm">
          <span
            className="inline-block w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse"
            aria-hidden="true"
          />
          Scientia Potentia Est
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6">
          Formando cidadãos,{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500">
            transformando realidades
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-blue-200 max-w-2xl mx-auto mb-10 leading-relaxed">
          {SCHOOL_NAME} <br /> {SCHOOL_LOCATION}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            size="lg"
            className="bg-yellow-400 hover:bg-yellow-300 text-[#1a3a6b] font-bold px-8 py-6 text-base shadow-lg shadow-yellow-400/20 hover:shadow-yellow-300/30 transition-all duration-300 hover:scale-105"
            onClick={() => handleScroll("#sobre")}
            aria-label="Conhecer a escola – ir para seção Sobre"
          >
            Conheça a escola
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:border-white/50 font-semibold px-8 py-6 text-base backdrop-blur-sm transition-all duration-300 hover:scale-105"
            onClick={() => handleScroll("#contato")}
            aria-label="Fale conosco – ir para seção Contato"
          >
            Fale conosco
          </Button>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-blue-300/60 text-sm animate-bounce"
          aria-hidden="true"
        >
          <span>rolar</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>
    </section>
  );
}
