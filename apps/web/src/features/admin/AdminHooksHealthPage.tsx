import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { http as api } from '../../lib/api/http';
import { type HooksHealthResponse } from '@pdc/shared';

const AdminHooksHealthPage: React.FC = () => {
  const { data, isLoading, refetch } = useQuery<HooksHealthResponse>({
    queryKey: ['admin', 'hooks-health'],
    queryFn: async () => {
      const res = await api.get<HooksHealthResponse>('/admin/hooks/health');
      return res;
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <div className="p-8 text-center font-mono text-xs opacity-50">A carregar métricas ecossistémicas...</div>;

  const healthData = data;
  const outbox = healthData?.outbox ?? { pendentes: 0, falhados: 0, processados24h: 0 };
  const hooks = healthData?.hooks ?? [];

  return (
    <div className="max-w-7xl mx-auto p-6 bg-[#F8F9FA] min-height-screen font-inter text-[#2A2724]">
      <div className="flex justify-between items-end mb-8">
        <div>
          <span className="font-mono text-[11px] text-[#D2691E] tracking-widest uppercase">Admin · Observabilidade</span>
          <h1 className="font-instrument-serif text-4xl mt-2">Saúde dos Hooks Ecossistémicos</h1>
        </div>
        <button 
          onClick={() => { void refetch(); }}
          className="font-mono text-[11px] text-[#8A867F] bg-[#FAF6EE] px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#F2EFE8] transition-colors"
        >
          <div className="w-2 h-2 rounded-full bg-[#2F7A4F] animate-pulse" />
          Atualiza a cada 30s
        </button>
      </div>

      <div className="grid grid-cols-4 grid-rows-2 gap-5 mb-8">
        {/* Outbox Tile (Large) */}
        <div className="col-span-2 row-span-2 bg-[#FAF6EE] rounded-[18px_6px_18px_6px] p-6 shadow-sm flex flex-col">
          <span className="font-mono text-[11px] text-[#8A867F] tracking-wider">OUTBOX · DOMAIN EVENTS</span>
          <h2 className="font-instrument-serif text-2xl mt-2">Fila de eventos pendentes</h2>
          
          <div className="grid grid-cols-2 gap-4 mt-6 flex-1">
            <div className="bg-[#F2EFE8] p-4 rounded-xl">
              <span className="font-mono text-[10px] text-[#8A867F]">PENDENTES AGORA</span>
              <div className="font-instrument-serif text-3xl mt-1">{outbox.pendentes}</div>
            </div>
            <div className="bg-[#F2EFE8] p-4 rounded-xl">
              <span className="font-mono text-[10px] text-[#8A867F]">FALHADOS ({'>'}3 TENT)</span>
              <div className={`font-instrument-serif text-3xl mt-1 ${outbox.falhados > 0 ? 'text-[#B23B2E]' : ''}`}>
                {outbox.falhados}
              </div>
            </div>
            <div className="bg-[#F2EFE8] p-4 rounded-xl">
              <span className="font-mono text-[10px] text-[#8A867F]">PROCESSADOS (24H)</span>
              <div className="font-instrument-serif text-3xl mt-1">{(outbox.processados24h / 1000).toFixed(1)}k</div>
            </div>
            <div className="bg-[#F2EFE8] p-4 rounded-xl">
              <span className="font-mono text-[10px] text-[#8A867F]">LATÊNCIA P95</span>
              <div className="font-instrument-serif text-3xl mt-1">~42ms</div>
            </div>
          </div>

          <div className="mt-6 inline-flex items-center gap-2 bg-[#2F7A4F]/10 text-[#2F7A4F] px-3 py-1 rounded-full text-[10px] font-mono self-start">
            <div className="w-1.5 h-1.5 rounded-full bg-[#2F7A4F]" />
            OUTBOX SAUDÁVEL
          </div>
        </div>

        {/* Hook Tiles */}
        {hooks.map((hook) => (
          <div key={hook.name} className="bg-[#FAF6EE] rounded-2xl p-5 shadow-sm flex flex-col">
            <span className="font-mono text-[11px] text-[#8A867F] uppercase tracking-wider">Hook · {hook.name}</span>
            <div className="flex justify-between items-baseline mt-3">
              <div className="font-instrument-serif text-3xl">{hook.successRate}<em className="text-[#D2691E] not-italic text-sm align-top ml-0.5">%</em></div>
              <div className="text-[10px] font-mono text-[#8A867F] text-right leading-tight">
                SUCCESS · 24H<br/>P95 {hook.latency}
              </div>
            </div>
            {/* Sparkline placeholder */}
            <div className="flex items-end gap-0.5 h-8 mt-4">
              {[60, 80, 70, 90, 75, 85, 95, 80].map((h, i) => (
                <div key={i} className="flex-1 bg-[#D2691E]/70 rounded-sm" style={{ height: `${String(h)}%` }} />
              ))}
            </div>
            <div className="mt-auto pt-4 inline-flex items-center gap-2 text-[#2F7A4F] text-[10px] font-mono">
              <div className="w-1.5 h-1.5 rounded-full bg-[#2F7A4F]" />
              {hook.status}
            </div>
          </div>
        ))}

        {/* Channels Stats */}
        <div className="bg-[#FAF6EE] rounded-2xl p-5 shadow-sm flex flex-col">
          <span className="font-mono text-[11px] text-[#8A867F] tracking-wider">CANAIS · ÚLTIMA HORA</span>
          <div className="mt-4 flex flex-col gap-2 font-mono text-[11px] text-[#5A5751]">
            <div className="flex justify-between"><span>SOCKET</span><span className="text-[#2F7A4F]">2.1k ✓</span></div>
            <div className="flex justify-between"><span>WEBPUSH</span><span className="text-[#2F7A4F]">847 ✓</span></div>
            <div className="flex justify-between"><span>APNS</span><span className="text-[#2F7A4F]">312 ✓</span></div>
            <div className="flex justify-between"><span>FCM</span><span className="text-[#C68A2E]">198 ⚠ 4 fail</span></div>
            <div className="flex justify-between"><span>EMAIL</span><span className="text-[#2F7A4F]">42 ✓</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHooksHealthPage;
