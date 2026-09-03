"use client";

import { motion, useReducedMotion } from "framer-motion";
import { MapPin } from "lucide-react";

export default function MorningBrief({
  firstName,
  schoolName,
  summary,
  period,
}: {
  firstName: string | null;
  schoolName: string | null;
  summary: string;
  period: string;
}) {
  const reduce = useReducedMotion();
  const hello = firstName ? `Bonjour ${firstName}` : "Bonjour";

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col gap-1.5 mb-6"
    >
      <div className="flex items-center gap-2">
        <h1 className="text-[20px] font-bold tracking-tight text-text">
          {hello} <span aria-hidden="true">👋</span>
        </h1>
        <span className="text-rule/60 hidden sm:inline">|</span>
        <div className="hidden sm:flex items-center gap-1.5 text-role-meta font-medium uppercase tracking-wider text-text-soft">
          <MapPin className="h-3.5 w-3.5" />
          {schoolName}
        </div>
      </div>
      
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />
          {period}
        </span>
        <p className="text-[14px] text-text-soft">
          {summary}
        </p>
      </div>
    </motion.section>
  );
}
