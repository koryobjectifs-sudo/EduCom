"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, FileText, Loader2, Download } from "lucide-react";
import { getReportCardData } from "../../grades/actions";

export default function ReportCardGenerator({ classes, terms, school }: { classes: any[], terms: any[], school: any }) {
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [selectedEvaluation, setSelectedEvaluation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  
  // Appréciation globale qui s'appliquera par défaut à tous
  const [globalAppreciation, setGlobalAppreciation] = useState("Excellent travail.");

  const generateReports = async () => {
    if (!selectedClass || !selectedTerm || !selectedEvaluation) return;
    setIsLoading(true);
    const res = await getReportCardData(selectedClass, selectedTerm, selectedEvaluation);
    if (res.data) {
      // Process data to calculate averages and ranks
      const processedStudents = res.data.students.map((student: any) => {
        const studentGrades = res.data.grades.filter((g: any) => g.studentId === student.id);
        
        let totalScore = 0;
        let totalCoeff = 0;
        
        const subjectsList = studentGrades.map((g: any) => {
          const score = g.value;
          const coef = g.coefficient;
          totalScore += score * coef;
          totalCoeff += coef;
          return {
            subjectName: g.subject.name,
            score: score,
            coef: coef,
            comment: g.comment || ""
          };
        });

        const average = totalCoeff > 0 ? (totalScore / totalCoeff) : 0;

        return {
          ...student,
          grades: subjectsList,
          average: average,
          totalCoeff: totalCoeff
        };
      });

      // Calculate ranks
      // Sort students by average descending
      processedStudents.sort((a: any, b: any) => b.average - a.average);
      
      // Assign ranks (handling ties)
      let currentRank = 1;
      for (let i = 0; i < processedStudents.length; i++) {
        if (i > 0 && processedStudents[i].average === processedStudents[i - 1].average) {
          processedStudents[i].rank = processedStudents[i - 1].rank;
        } else {
          processedStudents[i].rank = currentRank;
        }
        currentRank++;
      }

      // Re-sort alphabetically for display
      processedStudents.sort((a: any, b: any) => a.lastName.localeCompare(b.lastName));

      // Calculate class average
      const validAverages = processedStudents.filter((s: any) => s.totalCoeff > 0).map((s: any) => s.average);
      const classAverage = validAverages.length > 0 
        ? (validAverages.reduce((acc: number, val: number) => acc + val, 0) / validAverages.length) 
        : 0;

      const currentTerm = terms.find(t => t.id === selectedTerm);
      const currentEval = currentTerm?.evaluations?.find((e: any) => e.id === selectedEvaluation);

      setReportData({
        students: processedStudents,
        classAverage: classAverage,
        className: classes.find(c => c.id === selectedClass)?.name,
        termName: currentTerm?.name,
        evaluationName: currentEval?.name,
        evaluationType: currentEval?.type
      });
    }
    setIsLoading(false);
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper to format rank (1er, 2ème, 3ème, etc.)
  const formatRank = (rank: number) => {
    if (rank === 1) return "1er";
    return `${rank}ème`;
  };

  return (
    <div className="space-y-4 pb-12 print:p-0 print:m-0 print:pb-0">
      {/* Control Panel (Hidden when printing) */}
      <div className="w-full max-w-5xl mx-auto bg-white border border-gray-200 rounded-xl print:hidden shadow-sm flex flex-col mb-8">
        <div className="flex flex-wrap items-center justify-between px-4 py-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/documents" className="p-1.5 hover:bg-gray-200 rounded-md text-gray-500 mr-1" title="Retour">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            
            <select 
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-white border border-gray-200 text-sm font-semibold text-gray-800 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Sélectionner une classe...</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <select 
              value={selectedTerm}
              onChange={(e) => {
                setSelectedTerm(e.target.value);
                setSelectedEvaluation("");
              }}
              className="bg-white border border-gray-200 text-sm font-semibold text-gray-800 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Sélectionner un trimestre...</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            <select 
              value={selectedEvaluation}
              onChange={(e) => setSelectedEvaluation(e.target.value)}
              disabled={!selectedTerm}
              className="bg-white border border-gray-200 text-sm font-semibold text-gray-800 rounded-lg py-2 px-3 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Sélectionner une évaluation...</option>
              {terms.find(t => t.id === selectedTerm)?.evaluations?.map((ev: any) => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>

            <button 
              onClick={generateReports}
              disabled={!selectedClass || !selectedTerm || !selectedEvaluation || isLoading}
              className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Générer
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint} 
              disabled={!reportData}
              className="flex items-center gap-2 text-sm font-semibold text-white bg-blue-600 rounded-lg px-4 py-2 shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" /> Imprimer / PDF
            </button>
          </div>
        </div>
        
        {reportData && (
          <div className="p-4 bg-white rounded-b-xl border-t border-gray-100 flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Appréciation globale (Optionnelle) :</label>
            <input 
              type="text" 
              value={globalAppreciation}
              onChange={(e) => setGlobalAppreciation(e.target.value)}
              placeholder="Appréciation par défaut qui s'affichera sur tous les bulletins..."
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500"
            />
            <p className="text-xs text-gray-400 italic">Vous pourrez toujours modifier ce texte manuellement sur chaque bulletin avant d'imprimer.</p>
          </div>
        )}
      </div>

      {/* Render Report Cards */}
      <div className="flex flex-col items-center">
        {!reportData ? (
          <div className="w-full max-w-5xl h-48 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 print:hidden mt-8 bg-gray-50/50">
            <FileText className="w-10 h-10 text-gray-300 mb-3" />
            <p>Sélectionnez une classe, un trimestre et une évaluation pour générer les bulletins.</p>
          </div>
        ) : (
          <div className="w-full max-w-[210mm] print:w-full space-y-12 print:space-y-0">
            {reportData.students.map((student: any, index: number) => (
              <div 
                key={student.id} 
                className={`bg-white w-full p-10 sm:p-12 shadow-sm border border-gray-200 rounded-xl flex flex-col text-sm relative print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none overflow-hidden z-10 transition-all duration-300 ${index > 0 ? "print:break-before-page" : ""}`}
                style={{ minHeight: "297mm" }} // Standard A4 height approximation to keep layout consistent
              >
                
                {/* WATERMARK LOGO */}
                {school?.logo && (
                  <div className="absolute inset-0 flex justify-center items-center pointer-events-none -z-10 opacity-[0.03]">
                    <img src={school.logo} alt="" className="w-2/3 object-contain grayscale" />
                  </div>
                )}

                {/* HEADER */}
                <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8 z-10">
                  <div className="flex items-center gap-4">
                    {school?.logo ? (
                      <img src={school.logo} alt="Logo" className="h-16 object-contain" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-900 text-white font-semibold text-3xl">
                        {school?.name?.charAt(0) || "E"}
                      </div>
                    )}
                    <div>
                      <h2 
                        contentEditable suppressContentEditableWarning 
                        className="text-2xl font-black text-gray-900 uppercase tracking-tight outline-none focus:bg-gray-50 rounded px-1 -ml-1"
                      >
                        {school?.name || "—"}
                      </h2>
                      <p 
                        contentEditable suppressContentEditableWarning
                        className="text-xs font-semibold text-gray-500 uppercase tracking-widest mt-1 outline-none focus:bg-gray-50 rounded px-1 -ml-1"
                      >
                        Année Scolaire 2023-2024
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h1 
                      contentEditable suppressContentEditableWarning
                      className="text-3xl font-black text-gray-900 uppercase tracking-tight outline-none focus:bg-gray-50 rounded px-1 -mr-1"
                    >
                      {reportData.evaluationType === 'EXAM' ? 'Bulletin de Composition' : 'Bulletin de Notes'}
                    </h1>
                    <p 
                      contentEditable suppressContentEditableWarning
                      className="text-base font-semibold text-gray-500 uppercase tracking-widest mt-1 outline-none focus:bg-gray-50 rounded px-1 -mr-1"
                    >
                      {reportData.evaluationName} ({reportData.termName})
                    </p>
                  </div>
                </div>

                <div className="flex-grow flex flex-col">
                  {/* STUDENT INFO BLOCK */}
                  <div className="grid grid-cols-2 gap-8 bg-gray-50/50 border border-gray-200 p-6 rounded-lg mb-8 print:border-none print:bg-transparent print:p-0 print:mb-8">
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Nom de l'élève</p>
                      <p contentEditable suppressContentEditableWarning className="text-xl font-black text-gray-900 outline-none focus:bg-white rounded px-1 -ml-1">
                        {student.lastName.toUpperCase()} {student.firstName}
                      </p>
                      {student.dateOfBirth && (
                        <p contentEditable suppressContentEditableWarning className="text-sm text-gray-600 mt-1 outline-none focus:bg-white rounded px-1 -ml-1">
                          Né(e) le {new Date(student.dateOfBirth).toLocaleDateString("fr-FR")}
                        </p>
                      )}
                    </div>
                    <div className="text-right grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Classe</p>
                        <p contentEditable suppressContentEditableWarning className="text-lg font-bold text-gray-900 outline-none focus:bg-white rounded px-1 -mr-1">
                          {reportData.className}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Effectif: {reportData.students.length}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Moy. Classe</p>
                        <p className="text-lg font-bold text-gray-900">
                          {reportData.classAverage.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* GRADES TABLE */}
                  <div className="flex-grow relative mt-2">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr>
                          <th className="border-b-2 border-gray-900 py-2 px-2 font-bold text-gray-900 uppercase text-[10px] tracking-wider w-1/3">Matière</th>
                          <th className="border-b-2 border-gray-900 py-2 px-2 font-bold text-gray-900 uppercase text-[10px] tracking-wider text-center w-12">Coef</th>
                          <th className="border-b-2 border-gray-900 py-2 px-2 font-bold text-gray-900 uppercase text-[10px] tracking-wider text-center w-20">Note /20</th>
                          <th className="border-b-2 border-gray-900 py-2 px-2 font-bold text-gray-900 uppercase text-[10px] tracking-wider">Appréciations du Professeur</th>
                        </tr>
                      </thead>
                      <tbody>
                        {student.grades.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-gray-400 text-xs italic">Aucune note saisie pour cet élève.</td>
                          </tr>
                        ) : (
                          student.grades.map((g: any, idx: number) => (
                            <tr key={idx}>
                              <td className="border-b border-gray-200 py-3 px-2 font-semibold text-gray-800 text-xs">{g.subjectName}</td>
                              <td className="border-b border-gray-200 py-3 px-2 text-center text-gray-600 font-medium text-xs">{g.coef}</td>
                              <td className="border-b border-gray-200 py-3 px-2 text-center border-x border-gray-200 bg-gray-50/30 font-bold text-sm">{g.score.toFixed(2)}</td>
                              <td className="border-b border-gray-200 py-3 px-2 text-gray-700 italic text-xs">{g.comment}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={2} className="border-b-2 border-gray-900 py-4 px-2 font-black text-gray-900 uppercase text-right text-xs">Moyenne Générale</td>
                          <td className="border-b-2 border-gray-900 py-4 px-2 text-center border-x-2 border-gray-900 bg-gray-100 font-black text-lg">
                            {student.average.toFixed(2)}
                          </td>
                          <td className="border-b-2 border-gray-900 py-4 px-4 font-black text-blue-800 uppercase text-xs">
                            Rang: {formatRank(student.rank)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* FOOTER & SIGNATURES */}
                  <div className="mt-8 grid grid-cols-3 gap-4">
                    <div className="border border-gray-200 p-4 h-32 rounded-lg flex flex-col print:border-none print:px-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Vie Scolaire</span>
                      <span contentEditable suppressContentEditableWarning className="text-xs text-gray-700 mb-1 outline-none focus:bg-gray-50 rounded p-1 -ml-1">Absences: 0 jour(s)</span>
                      <span contentEditable suppressContentEditableWarning className="text-xs text-gray-700 outline-none focus:bg-gray-50 rounded p-1 -ml-1">Retards: 0</span>
                    </div>
                    <div className="border border-gray-200 p-4 h-32 rounded-lg flex flex-col print:border-none print:px-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Avis du Conseil</span>
                      <span contentEditable suppressContentEditableWarning className="text-xs text-gray-700 italic leading-snug break-words outline-none focus:bg-gray-50 rounded p-1 -ml-1">
                        {globalAppreciation}
                      </span>
                    </div>
                    <div className="border border-gray-200 p-4 h-32 rounded-lg flex flex-col text-right print:border-none print:px-0 relative">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Le Directeur</span>
                      {school?.signature && (
                         <div className="absolute bottom-4 right-4 h-16 opacity-80">
                           <img src={school.signature} alt="Signature" className="h-full object-contain" />
                         </div>
                      )}
                      {school?.stamp && (
                         <div className="absolute bottom-2 right-24 h-20 opacity-40">
                           <img src={school.stamp} alt="Tampon" className="h-full object-contain" />
                         </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
