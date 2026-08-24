"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Play, CheckCircle2 } from "lucide-react";

export default function Hero() {
  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 15 },
    },
  };

  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50/50 via-white to-white"></div>
      <div className="absolute top-0 right-0 -z-10 w-[800px] h-[800px] bg-blue-100/40 rounded-full blur-3xl opacity-50 transform translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 left-0 -z-10 w-[600px] h-[600px] bg-indigo-100/40 rounded-full blur-3xl opacity-50 transform -translate-x-1/2 translate-y-1/2" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Text Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center lg:text-left max-w-2xl mx-auto lg:mx-0"
          >
            <motion.div variants={itemVariants} className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-medium">
              <span className="flex h-2 w-2 rounded-full bg-blue-600"></span>
              La plateforme éducative de demain
            </motion.div>
            
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-[1.1]"
            >
              Gérez votre établissement avec <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">simplicité</span>
            </motion.h1>
            
            <motion.p
              variants={itemVariants}
              className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed"
            >
              EduCom réinvente la gestion scolaire. Centralisez l'administration, simplifiez la communication et suivez la réussite de vos élèves sur une seule plateforme intuitive.
            </motion.p>
            
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-10"
            >
              <Link
                href="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 hover:shadow-blue-500/50 transition-all hover:-translate-y-0.5 active:translate-y-0"
              >
                Commencer gratuitement
                <ArrowRight className="h-5 w-5" />
              </Link>
              <button
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-8 py-4 text-base font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                <Play className="h-5 w-5 text-blue-600" />
                Voir la démo
              </button>
            </motion.div>
            
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-sm text-slate-600"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>Aucune carte bancaire requise</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span>14 jours d'essai gratuit</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Abstract Dashboard Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 100 }}
            className="relative lg:h-[600px] w-full flex items-center justify-center"
          >
            <div className="relative w-full max-w-lg mx-auto">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-indigo-50 transform rotate-3 rounded-3xl -z-10 blur-xl opacity-70"></div>
              
              <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative z-10">
                {/* Mockup Header */}
                <div className="h-12 border-b border-slate-100 flex items-center px-4 gap-2 bg-slate-50/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="mx-auto flex items-center gap-2 px-3 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-400 w-1/2 max-w-[200px]">
                    <span className="truncate">educom.app/dashboard</span>
                  </div>
                </div>
                
                {/* Mockup Body */}
                <div className="p-6 flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-5 w-32 bg-slate-200 rounded-md mb-2"></div>
                      <div className="h-3 w-24 bg-slate-100 rounded-md"></div>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 border border-blue-200 flex items-center justify-center">
                      <div className="h-5 w-5 bg-blue-600 rounded-sm opacity-20"></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="h-3 w-16 bg-slate-200 rounded-md mb-3"></div>
                        <div className="h-6 w-12 bg-slate-300 rounded-md"></div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 h-40 flex items-end gap-2 pt-10">
                    {[40, 70, 45, 90, 65, 85, 60].map((h, i) => (
                      <div key={i} className="w-full bg-blue-100 rounded-t-sm" style={{ height: `${h}%` }}>
                        <div className="w-full bg-blue-500 rounded-t-sm opacity-80" style={{ height: `${h * 0.8}%` }}></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating elements */}
              <motion.div 
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -right-8 -top-8 bg-white p-4 rounded-xl shadow-xl border border-slate-100 z-20 flex items-center gap-4"
              >
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">Présences à jour</div>
                  <div className="text-xs text-slate-500">Il y a 2 minutes</div>
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [10, -10, 10] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -left-8 -bottom-8 bg-white p-4 rounded-xl shadow-xl border border-slate-100 z-20 flex items-center gap-4"
              >
                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                  A+
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">Moyenne trimestrielle</div>
                  <div className="text-xs text-green-600 font-medium">+12% d'amélioration</div>
                </div>
              </motion.div>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
