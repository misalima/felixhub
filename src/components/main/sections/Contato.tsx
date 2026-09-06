import { MapPin, Phone, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SCHOOL_CONTACT } from "@/constants/main/school";


function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function Contato() {
  return (
    <section
      id="contato"
      aria-labelledby="contato-heading"
      className="py-20 lg:py-28 bg-[#1a3a6b] relative overflow-hidden"
    >
      {/* Decorative blobs */}
      <div
        className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full translate-x-1/3 -translate-y-1/2 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-0 w-80 h-80 bg-yellow-400/10 rounded-full -translate-x-1/3 translate-y-1/3 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="bg-yellow-400/20 text-yellow-300 border-yellow-400/30 text-sm font-semibold uppercase tracking-wider px-3 py-1 mb-4">
            Contato
          </Badge>
          <h2
            id="contato-heading"
            className="text-3xl sm:text-4xl font-extrabold text-white mb-4"
          >
            Fale <span className="text-yellow-400">conosco</span>
          </h2>
          <p className="text-blue-200 text-lg max-w-xl mx-auto">
            Entre em contato para saber mais sobre a escola, matrícula ou parceria.
          </p>
        </div>

        {/* Contact columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* Endereço */}
          <div className="bg-white/10 border border-white/20 rounded-2xl p-6 backdrop-blur-sm hover:bg-white/15 transition-colors">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl bg-yellow-400/20 mb-4"
              aria-hidden="true"
            >
              <MapPin className="w-6 h-6 text-yellow-400" aria-hidden="true" />
            </div>
            <h3 className="text-white font-bold text-base mb-2">Endereço</h3>
            {/* TODO: Substituir pelo endereço real da escola */}
            <address className="text-blue-200 text-sm not-italic leading-relaxed">
              {SCHOOL_CONTACT.address}
            </address>
          </div>

          {/* Telefone / Email */}
          <div className="bg-white/10 border border-white/20 rounded-2xl p-6 backdrop-blur-sm hover:bg-white/15 transition-colors">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl bg-yellow-400/20 mb-4"
              aria-hidden="true"
            >
              <Phone className="w-6 h-6 text-yellow-400" aria-hidden="true" />
            </div>
            <h3 className="text-white font-bold text-base mb-2">Telefone &amp; E-mail</h3>
            <div className="space-y-2">
              {/* TODO: Substituir pelo telefone real */}
              <a
                href={`tel:${SCHOOL_CONTACT.phone.replace(/\D/g, "")}`}
                className="flex items-center gap-2 text-blue-200 hover:text-white text-sm transition-colors"
                aria-label={`Ligar para ${SCHOOL_CONTACT.phone}`}
              >
                <Phone className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                {SCHOOL_CONTACT.phone}
              </a>
              {/* TODO: Substituir pelo e-mail real */}
              <a
                href={`mailto:${SCHOOL_CONTACT.email}`}
                className="flex items-center gap-2 text-blue-200 hover:text-white text-sm transition-colors break-all"
                aria-label={`Enviar e-mail para ${SCHOOL_CONTACT.email}`}
              >
                <Mail className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                {SCHOOL_CONTACT.email}
              </a>
            </div>
          </div>

          {/* Redes Sociais */}
          <div className="bg-white/10 border border-white/20 rounded-2xl p-6 backdrop-blur-sm hover:bg-white/15 transition-colors">
            <div
              className="flex items-center justify-center w-12 h-12 rounded-xl bg-yellow-400/20 mb-4"
              aria-hidden="true"
            >
              <svg
                className="w-6 h-6 text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-white font-bold text-base mb-4">Redes Sociais</h3>
            <div className="flex items-center gap-3">
              {/* Instagram */}
              <a
                href={SCHOOL_CONTACT.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 hover:opacity-90 rounded-full transition-opacity text-white"
                aria-label="Acessar perfil do Instagram da escola (abre em nova aba)"
              >
                <InstagramIcon className="w-5 h-5" />
              </a>
              {/* TODO: Inserir número real do WhatsApp */}
              <a
                href={SCHOOL_CONTACT.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-10 h-10 bg-green-500 hover:bg-green-400 rounded-full transition-colors text-white"
                aria-label="Contato via WhatsApp da escola (abre em nova aba)"
              >
                <WhatsAppIcon className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Google Maps Embed */}
        <div className="rounded-2xl overflow-hidden border border-white/20 shadow-xl h-64 sm:h-80">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3929.9843317737927!2d-36.5566281246011!3d-9.93526129016687!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x70433f935734353%3A0x1f2bda4db52c7c41!2sE.%20E.%20Prof.%20Jos%C3%A9%20F%C3%A9lix%20de%20Carvalho%20Alves!5e0!3m2!1spt-BR!2sbr!4v1778374242244!5m2!1spt-BR!2sbr"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Localização da Escola Estadual Professor José Félix de Carvalho Alves no Google Maps"
          />
        </div>
      </div>
    </section>
  );
}
