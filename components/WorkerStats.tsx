
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
    <div className="space-y-8 animate-fadeIn">
      <div className="section-header">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <span className="material-icons text-xl">assignment_ind</span>
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Sugestão de Escala</h2>
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Obreiros que realizaram a função há mais tempo</p>
      </div>

      <div className="grid gap-5">
        {CULTOS.map(culto => (
          <div key={culto.id} className="card-main overflow-hidden">
            <button onClick={() => setExpandedDay(expandedDay === culto.id ? null : culto.id)} className={`w-full px-8 py-6 flex items-center justify-between transition-colors ${expandedDay === culto.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-[11px] shadow-sm transition-all ${expandedDay === culto.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{culto.id}</div>
                <span className="font-black text-slate-900 text-sm tracking-widest uppercase">{culto.fullName}</span>
              </div>
              <span className={`material-icons text-slate-300 transition-transform ${expandedDay === culto.id ? 'rotate-180 text-indigo-500' : ''}`}>expand_more</span>
            </button>

            {expandedDay === culto.id && (
              <div className="p-8 space-y-6 animate-fadeIn">
                {culto.roles.map(role => {
                  const isRoleExpanded = expandedRoles[`${culto.id}-${role}`];
                  const stats = getStats(culto.fullName, role as any);
                  return (
                    <div key={role} className="border border-slate-100 rounded-3xl overflow-hidden bg-slate-50">
                      <button onClick={() => toggleRole(culto.id, role)} className="w-full px-6 py-5 flex items-center justify-between hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="material-icons text-indigo-500 text-lg">{role === 'gate' ? 'door_front' : role === 'praise' ? 'music_note' : 'record_voice_over'}</span>
                          <span className="font-black text-[10px] text-slate-500 uppercase tracking-widest">{role === 'gate' ? 'Portão' : role === 'praise' ? 'Louvor' : 'Palavra'}</span>
                        </div>
                        <span className={`material-icons text-slate-300 text-sm transition-transform ${isRoleExpanded ? 'rotate-180' : ''}`}>keyboard_arrow_down</span>
                      </button>
                      {isRoleExpanded && (
                        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
                          {stats.map((worker, i) => (
                            <div key={worker.name} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${i === 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
                              <span className={`text-xs font-black uppercase tracking-tight ${i === 0 ? 'text-emerald-700' : 'text-slate-700'}`}>{worker.name}</span>
                              <div className="text-right">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${worker.daysSince === Infinity ? 'text-indigo-600' : 'text-slate-400'}`}>
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
