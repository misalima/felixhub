"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

interface Student {
  id: string;
  nome_completo: string;
}

export default function ReportCardsPage() {
  const [classes, setClasses] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [birthDateDisplay, setBirthDateDisplay] = useState(""); // Para o input com máscara (DD/MM/AAAA)
  const [_loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function getClasses() {
      const { data } = await supabase.from("alunos_boletins").select("turma");
      const uniqueTurmas = Array.from(new Set(data?.map((d) => d.turma)));
      setClasses(uniqueTurmas.sort());
    }
    getClasses();
  }, []);

  useEffect(() => {
    if (!selectedClass) {
      setStudents([]);
      return;
    }
    async function getStudents() {
      const { data } = await supabase
        .from("alunos_boletins")
        .select("id, nome_completo")
        .eq("turma", selectedClass)
        .order("nome_completo");
      setStudents(data || []);
    }
    getStudents();
    setSelectedStudentId("");
    setError("");
  }, [selectedClass]);

  // Função para aplicar máscara de data (DD/MM/AAAA)
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ""); // Remove tudo que não é número
    if (value.length > 8) value = value.slice(0, 8); // Limita a 8 dígitos

    // Aplica a máscara
    if (value.length >= 5) {
      value = `${value.slice(0, 2)}/${value.slice(2, 4)}/${value.slice(4)}`;
    } else if (value.length >= 3) {
      value = `${value.slice(0, 2)}/${value.slice(2)}`;
    }

    setBirthDateDisplay(value);
  };

  const _handleDownload = async () => {
    setLoading(true);
    setError("");

    // Converte DD/MM/AAAA para YYYY-MM-DD para a API
    const parts = birthDateDisplay.split("/");
    if (parts.length !== 3 || birthDateDisplay.length !== 10) {
      setError("Por favor, digite a data completa (DD/MM/AAAA)");
      setLoading(false);
      return;
    }
    const _formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

    try {
      // TODO: Boletim download API deactivated
      /*
      const res = await fetch("/api/boletim/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alunoId: selectedStudentId,
          dataNascimento: formattedDate,
        }),
      });

      const result = await res.json();

      if (res.ok && result.url) {
        window.location.href = result.url;
      } else {
        setError(
          result.error ||
            "Dados incorretos. Verifique se a data de nascimento está certa."
        );
      }
      */
      setError("O recurso de download de boletim está temporariamente indisponível.");
    } catch {
      setError("Ocorreu um erro ao processar sua solicitação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
        {/* Header com Logo */}
        <div
          className="p-8 text-white text-center"
          style={{ backgroundColor: "#3e4095" }}
        >
          <div className="flex items-center justify-center mb-4">
            <Image
              src="/logo_escola.png"
              alt="Logo da Escola"
              width={80}
              height={80}
              className="rounded-full bg-white p-2"
            />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Portal do Aluno
          </h1>
          <p className="text-blue-200 text-sm mt-2 font-medium">
            E. E. Prof. José Félix de Carvalho Alves
          </p>
        </div>

        {/* Form */}
        <div className="p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">
              Acesso ao Boletim 2025
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Siga os passos abaixo para baixar seu documento
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-600 p-4 text-red-800 text-sm font-medium animate-pulse">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Passo 1: Turma */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                1. Selecione sua Turma
              </label>
              <select
                className="w-full p-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl outline-none transition-all appearance-none cursor-pointer font-medium"
                onChange={(e) => setSelectedClass(e.target.value)}
                value={selectedClass}
                style={{ color: "black" }}
              >
                <option value="" className="text-gray-500">
                  Clique para escolher a turma...
                </option>
                {classes.map((t) => (
                  <option key={t} value={t} className="text-black">
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Passo 2: Aluno */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                2. Selecione seu Nome
              </label>
              <select
                className="w-full p-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl outline-none transition-all disabled:opacity-40 disabled:bg-gray-100 cursor-pointer font-medium"
                disabled={!selectedClass}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                value={selectedStudentId}
                style={{ color: "black" }}
              >
                <option value="" className="text-gray-500">
                  Agora, escolha seu nome na lista...
                </option>
                {students.map((a) => (
                  <option key={a.id} value={a.id} className="text-black">
                    {a.nome_completo}
                  </option>
                ))}
              </select>
            </div>

            {/* Passo 3: Data de Nascimento */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                3. Informe sua Data de Nascimento
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ex: 15/04/2008"
                className="w-full p-4 bg-white border-2 border-gray-200 text-gray-900 rounded-xl outline-none transition-all font-medium"
                value={birthDateDisplay}
                onChange={handleDateChange}
              />
              <p className="text-[10px] text-gray-400 mt-1 ml-1 italic">
                * Digite apenas os números da sua data de nascimento.
              </p>
            </div>

            <button
              disabled={true}
              className="w-full cursor-not-allowed text-white font-black py-5 rounded-xl shadow-lg mt-4 flex items-center justify-center text-lg tracking-wider"
              style={{ backgroundColor: "#d1d5db" }}
            >
              TEMPORARIAMENTE INDISPONÍVEL
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-6 text-center border-t border-gray-100">
          <p className="text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">
            Coordenação Pedagógica
          </p>
          <p className="text-xs text-gray-500 mt-2 font-medium">
            Desenvolvido por{" "}
            <span className="font-bold" style={{ color: "#3e4095" }}>
              Misael Lima
            </span>
          </p>
        </div>
      </div>

      <p className="mt-8 text-gray-400 text-[10px] font-medium uppercase tracking-widest">
        © 2025 - Escola José Félix - Todos os direitos reservados
      </p>
    </div>
  );
}
