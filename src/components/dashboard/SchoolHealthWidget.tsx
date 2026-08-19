"use client";

import { useState } from "react";

type FilterType = "Quotidien" | "Hebdo" | "Mensuel" | "Annuel";

type HealthData = {
  collectionRate: number;
  studentsCount: number;
  studentTarget: number;
  attendanceRate: number;
};

// Simulated data variations based on time filter
const filterData: Record<FilterType, HealthData> = {
  Quotidien: { collectionRate: 15, studentsCount: 2, studentTarget: 10, attendanceRate: 95 },
  Hebdo: { collectionRate: 45, studentsCount: 15, studentTarget: 50, attendanceRate: 92 },
  Mensuel: { collectionRate: 70, studentsCount: 120, studentTarget: 150, attendanceRate: 96 },
  Annuel: { collectionRate: 85, studentsCount: 412, studentTarget: 500, attendanceRate: 98 },
};

// We receive the "real" yearly data as props to initialize the 'Annuel' filter accurately
export default function SchoolHealthWidget({ 
  initialData 
}: { 
  initialData: HealthData 
}) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("Annuel");

  // Merge the real data into our simulated data for "Annuel"
  const currentData = activeFilter === "Annuel" ? initialData : filterData[activeFilter];
  
  const enrollmentRate = Math.min(Math.round((currentData.studentsCount / currentData.studentTarget) * 100), 100);

  return (
    <div className="group relative overflow-hidden bg-white/60 backdrop-blur-xl rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-white/60 h-[280px] flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      {/* Decorative corner */}
      <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-emerald-50 opacity-70 pointer-events-none group-hover:scale-150 transition-transform duration-700 ease-out z-0"></div>
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-base font-semibold text-text-primary">Santé de l'école</h3>
          <div className="flex gap-2 text-xs font-semibold">
            {(Object.keys(filterData) as FilterType[]).map(filter => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`transition-colors pb-0.5 border-b-2 ${
                  activeFilter === filter 
                    ? "text-primary border-primary" 
                    : "text-text-muted hover:text-text-primary border-transparent"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-6 flex-1">
          <div className="space-y-4 flex-1">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-3 rounded-full bg-[#ffb020] transition-all"></div>
                <span className="text-xs font-medium text-text-secondary">Recouvrement</span>
              </div>
              <p className="text-xl font-semibold text-text-primary transition-all">
                <span className="text-2xl">{currentData.collectionRate}</span>
                <span className="text-text-muted text-sm font-medium">%</span>
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-3 rounded-full bg-[#00c2ff] transition-all"></div>
                <span className="text-xs font-medium text-text-secondary">Inscriptions</span>
              </div>
              <p className="text-xl font-semibold text-text-primary transition-all">
                <span className="text-2xl">{currentData.studentsCount}</span>
                <span className="text-text-muted text-sm font-medium">/{currentData.studentTarget}</span>
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-3 rounded-full bg-[#2dd4bf] transition-all"></div>
                <span className="text-xs font-medium text-text-secondary">Présence</span>
              </div>
              <p className="text-xl font-semibold text-text-primary transition-all">
                <span className="text-2xl">{currentData.attendanceRate}</span>
                <span className="text-text-muted text-sm font-medium">%</span>
              </p>
            </div>
          </div>
          
          {/* Visual Representation of Activity Rings */}
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90 transition-all duration-500" viewBox="0 0 100 100">
              <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              
              {/* Ring 1 - Recouvrement (Yellow) */}
              <circle cx="50" cy="50" r="42" fill="none" stroke="#ffb020" strokeOpacity="0.2" strokeWidth="8" />
              <circle 
                cx="50" cy="50" r="42" fill="none" stroke="#ffb020" strokeWidth="8" 
                strokeDasharray="264" 
                strokeDashoffset={264 - (264 * currentData.collectionRate) / 100} 
                strokeLinecap="round" 
                className="transition-all duration-700 ease-out"
                filter="url(#glow)"
              />
              
              {/* Ring 2 - Inscriptions (Blue) */}
              <circle cx="50" cy="50" r="30" fill="none" stroke="#00c2ff" strokeOpacity="0.2" strokeWidth="8" />
              <circle 
                cx="50" cy="50" r="30" fill="none" stroke="#00c2ff" strokeWidth="8" 
                strokeDasharray="188" 
                strokeDashoffset={188 - (188 * enrollmentRate) / 100} 
                strokeLinecap="round" 
                className="transition-all duration-700 ease-out delay-75"
                filter="url(#glow)"
              />
              
              {/* Ring 3 - Présence (Green) */}
              <circle cx="50" cy="50" r="18" fill="none" stroke="#2dd4bf" strokeOpacity="0.2" strokeWidth="8" />
              <circle 
                cx="50" cy="50" r="18" fill="none" stroke="#2dd4bf" strokeWidth="8" 
                strokeDasharray="113" 
                strokeDashoffset={113 - (113 * currentData.attendanceRate / 100)} 
                strokeLinecap="round" 
                className="transition-all duration-700 ease-out delay-150"
                filter="url(#glow)"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
