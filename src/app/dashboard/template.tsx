"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        type: "spring",
        stiffness: 260,
        damping: 20,
        duration: 0.3 
      }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}
