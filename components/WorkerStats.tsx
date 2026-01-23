
import React, { useState, useMemo } from 'react';
import { ServiceRecord } from '../types';
import { WORKERS_LIST } from '../constants';

interface Props { history: ServiceRecord[]; }

const CULTOS = [
  { id: 'SEG', label: 'SEGUNDA', fullName: 'SEGUNDA-FEIRA', roles: ['gate', 'praise'] },
  { id: 'TER', label: 'TERÇA', fullName: 'TERÇA-FEIRA', roles: ['gate', 'praise', 'word'] },
  { id: 'QUA', label: 'QUARTA', fullName: 'QUARTA-FEIRA', roles: ['gate'] },
  { id: 'QUI', label: 'QUINTA', fullName: 'QUINTA-FEIRA', roles: ['gate', 'praise', 'word'] },
  { id: 'SÁB', label: 'SÁBADO', fullName: 'SÁBADO', roles: ['gate', 'praise', 'word'] },
  { id: 'EBD', label: 'EBD', fullName: 'EBD', roles: ['gate', 'praise', 'word'] },
  { id: 'DOM', label: 'DOM', fullName: 'DOM', roles: ['gate', 'praise', 'word'] }
];

const WorkerStats: React.FC<Props> = ({ history }) => {
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [expandedRoles, setExpandedRoles] = useState<Record<string, boolean>>({});

  const officialWorkers = useMemo(() => WORKERS_LIST.filter(name => !['VISITANTE', 'TRANSMISSÃO'].includes(name)), []);

  const getStats = (dayFullName: string, role: 'gate' | 'praise' | 'word') => {
    const today = new Date(); today.setHours(12, 0, 0, 0);
    return officialWorkers.map(name => {
      const filtered = history.filter(r => r.description === dayFullName && r.roles[role] === name).sort((a, b) => b.date.localeCompare(a.date));
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

  return (
    <div className="space-y-8 animate-fadeIn pb-10">
      <div className="px-2">
        <h2 className="text-2xl font-black text-white tracking-tight uppercase">Sugestão de Escala</h2>
        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mt-1">Quem realizou a função há mais tempo</p>
      </div>

      <div className="grid gap-5">
        {CULTOS.map(culto => (
          <div key={culto.id} className="bg-[#1e293b] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
            <button onClick={() => setExpandedDay(expandedDay === culto.id ? null : culto.id)} className={`w-full px-8 py-6 flex items-center justify-between transition-colors ${expandedDay === culto.id ? 'bg-[#0f172a]' : 'hover:bg-white/5'}`}>
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-[11px] shadow-lg transition-all ${expandedDay === culto.id ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/20'}`}>{culto.id}</div>
                <span className="font-black text-white text-sm tracking-widest uppercase">{culto.fullName}</span>
              </div>
              <span className={`material-icons text-white/10 transition-transform ${expandedDay === culto.id ? 'rotate-180 text-indigo-400' : ''}`}>expand_more</span>
            </button>

            {expandedDay === culto.id && (
              <div className="p-8 space-y-6 animate-fadeIn">
                {culto.roles.map(role => {
                  const isRoleExpanded = expandedRoles[`${culto.id}-${role}`];
                  const stats = getStats(culto.fullName, role as any);
                  return (
                    <div key={role} className="border border-white/5 rounded-3xl overflow-hidden bg-black/10">
                      <button onClick={() => toggleRole(culto.id, role)} className="w-full px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="material-icons text-indigo-400 text-lg">{role === 'gate' ? 'door_front' : role === 'praise' ? 'music_note' : 'record_voice_over'}</span>
                          <span className="font-black text-[10px] text-white/40 uppercase tracking-widest">{role === 'gate' ? 'Portão' : role === 'praise' ? 'Louvor' : 'Palavra'}</span>
                        </div>
                        <span className={`material-icons text-white/10 text-sm transition-transform ${isRoleExpanded ? 'rotate-180' : ''}`}>keyboard_arrow_down</span>
                      </button>
                      {isRoleExpanded && (
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-fadeIn">
                          {stats.map((worker, i) => (
                            <div key={worker.name} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${i === 0 ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-white/5 border-transparent'}`}>
                              <span className={`text-xs font-black uppercase tracking-tight ${i === 0 ? 'text-indigo-400' : 'text-white/60'}`}>{worker.name}</span>
                              <div className="text-right">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${worker.daysSince === Infinity ? 'text-emerald-500' : 'text-indigo-500/40'}`}>
                                  {worker.daysSince === Infinity ? 'NUNCA' : `${worker.daysSince}d`}
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
