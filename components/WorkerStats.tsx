
import React, { useState, useMemo } from 'react';
import { ServiceRecord } from '../types';
import { WORKERS_LIST } from '../constants';

interface Props { history: ServiceRecord[]; }

const CULTOS = [
  { id: 'SEG', label: 'SEGUNDA', fullName: 'SEGUNDA-FEIRA', roles: ['gate', 'praise'] },
  { id: 'TER', label: 'TERÇA', fullName: 'TERÇA-FEIRA', roles: ['gate', 'praise', 'word'] },
  { id: 'QUA', label: 'QUARTA', fullName: 'QUARTA-FEIRA', roles: ['gate'] },
  { id: 'QUI', label: 'QUINTA', fullName: 'QUINTA-FEIRA', roles: ['gate', 'leader'] },
  { id: 'SÁB', label: 'SÁBADO', fullName: 'SÁBADO', roles: ['gate', 'praise', 'word'] },
  { id: 'EBD', label: 'EBD', fullName: 'EBD', roles: ['gate', 'praise', 'word'] },
  { id: 'DOM', label: 'DOM', fullName: 'DOM', roles: ['gate', 'praise', 'word'] }
];

const WorkerStats: React.FC<Props> = ({ history }) => {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});

  const officialWorkers = useMemo(() => WORKERS_LIST.filter(name => !['VISITANTE', 'TRANSMISSÃO'].includes(name)), []);

  const getStats = (dayFullName: string, role: string) => {
    const today = new Date(); today.setHours(12, 0, 0, 0);
    return officialWorkers.map(name => {
      // Busca recência específica para o dia da semana atual do card
      const filtered = history.filter(r => {
        const isSameDayType = r.description === dayFullName;
        if (!isSameDayType) return false;

        const isDirectMatch = r.roles[role as keyof typeof r.roles] === name;
        // Se estivermos sugerindo Louvor ou Palavra, devemos considerar se ele foi Dirigente (leader)
        const isLeaderMatch = (role === 'praise' || role === 'word') && r.roles.leader === name;
        
        return isDirectMatch || isLeaderMatch;
      }).sort((a, b) => b.date.localeCompare(a.date));

      const lastDate = filtered[0]?.date || null;
      let daysSince = Infinity;
      if (lastDate) daysSince = Math.ceil((today.getTime() - new Date(lastDate + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24));
      return { name, lastDate, daysSince };
    }).sort((a, b) => b.daysSince - a.daysSince);
  };

  const toggleRole = (dayId: string, role: string) => {
    const key = `${dayId}-${role}`;
    setExpandedRoles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'gate': return 'Portão';
      case 'praise': return 'Louvor';
      case 'word': return 'Palavra';
      case 'leader': return 'Dirigente';
      default: return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch(role) {
      case 'gate': return 'door_front';
      case 'praise': return 'music_note';
      case 'word': return 'record_voice_over';
      case 'leader': return 'stars';
      default: return 'person';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      <div className="px-2">
        <h2 className="text-2xl font-black text-slate-800">Sugestão de Escala</h2>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Quem realizou a função há mais tempo</p>
      </div>

      <div className="grid gap-4">
        {CULTOS.map(culto => (
          <div key={culto.id} className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
            <button onClick={() => setExpandedDay(expandedDay === culto.id ? null : culto.id)} className="w-full px-6 py-5 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-[10px] shadow-sm ${expandedDay === culto.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400'}`}>{culto.id}</div>
                <span className="font-black text-slate-700 text-sm tracking-wide">{culto.fullName}</span>
              </div>
              <span className={`material-icons text-slate-300 transition-transform ${expandedDay === culto.id ? 'rotate-180' : ''}`}>expand_more</span>
            </button>

            {expandedDay === culto.id && (
              <div className="p-6 space-y-6 animate-fadeIn">
                {culto.roles.map(role => {
                  const isRoleExpanded = expandedRoles[`${culto.id}-${role}`];
                  const stats = getStats(culto.fullName, role);
                  return (
                    <div key={role} className="border border-slate-50 rounded-2xl overflow-hidden">
                      <button onClick={() => toggleRole(culto.id, role)} className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-slate-50">
                        <div className="flex items-center gap-2">
                          <span className="material-icons text-indigo-400 text-sm">{getRoleIcon(role)}</span>
                          <span className="font-black text-[10px] text-slate-500 uppercase tracking-widest">{getRoleLabel(role)}</span>
                        </div>
                        <span className={`material-icons text-slate-200 text-sm transition-transform ${isRoleExpanded ? 'rotate-180' : ''}`}>keyboard_arrow_down</span>
                      </button>
                      {isRoleExpanded && (
                        <div className="p-4 bg-slate-50/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {stats.map((worker, i) => (
                            <div key={worker.name} className={`flex items-center justify-between p-3 rounded-xl border ${i === 0 ? 'bg-indigo-50/50 border-indigo-100' : 'bg-white border-transparent'}`}>
                              <span className="text-xs font-bold text-slate-700">{worker.name}</span>
                              <div className="text-right">
                                <span className={`text-[9px] font-black uppercase ${worker.daysSince === Infinity ? 'text-emerald-500' : 'text-indigo-400'}`}>
                                  {worker.daysSince === Infinity ? 'Inédito' : `${worker.daysSince}d`}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkerStats;
