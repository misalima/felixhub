"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { SCHOOL_STATS } from "@/constants/main/school";

function useCountUp(target: number, duration = 1800, started: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!started) return;

    let start = 0;
    const step = target / (duration / 16); // ~60fps
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [target, duration, started]);

  return count;
}

interface StatCardProps {
  value: number;
  suffix: string;
  label: string;
  started: boolean;
}

function StatCard({ value, suffix, label, started }: StatCardProps) {
  const count = useCountUp(value, 1800, started);

  return (
    <Card className="bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-900/30">
      <CardContent className="pt-8 pb-8 text-center">
        <p className="text-5xl sm:text-6xl font-extrabold text-white mb-2 tabular-nums" aria-live="polite">
          {count}
          <span className="text-yellow-400">{suffix}</span>
        </p>
        <p className="text-blue-200 text-base font-medium tracking-wide">
          {label}
        </p>
      </CardContent>
    </Card>
  );
}

export function Numbers() {
  const sectionRef = useRef<HTMLElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [hasStarted]);

  return (
    <section
      id="numbers"
      ref={sectionRef}
      aria-labelledby="numbers-heading"
      className="py-20 lg:py-28 bg-[#1a3a6b] relative overflow-hidden"
    >
      {/* Decorative background blobs */}
      <div
        className="absolute top-0 left-0 w-80 h-80 bg-blue-500/20 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 right-0 w-96 h-96 bg-yellow-400/10 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2
            id="numbers-heading"
            className="text-3xl sm:text-4xl font-extrabold text-white mb-4"
          >
            Nossa escola em{" "}
            <span className="text-yellow-400">números</span>
          </h2>
          <p className="text-blue-200 text-lg max-w-xl mx-auto">
            Décadas de dedicação à educação pública de qualidade em São Sebastião – AL.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {SCHOOL_STATS.map((stat) => (
            <StatCard
              key={stat.id}
              value={stat.value}
              suffix={stat.suffix}
              label={stat.label}
              started={hasStarted}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
