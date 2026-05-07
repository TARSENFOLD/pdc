import { Link } from 'react-router-dom';
import type React from 'react';
import { NeuralConstellation, type NeuralState } from './NeuralConstellation';

interface AuthLeftPanelProps {
  neuralState?: NeuralState;
  onWarpComplete?: () => void;
  headline?: string;
  subline?: string;
}

export function AuthLeftPanel({
  neuralState = 'idle',
  onWarpComplete,
  headline = 'Por Dentro do Curso',
  subline = 'O universo académico inteiro, à tua medida.',
}: AuthLeftPanelProps): React.JSX.Element {
  return (
    <div className="fixed top-0 left-0 w-1/2 h-screen overflow-hidden select-none bg-black" style={{ zIndex: 10 }}>
      {/* Neural constellation canvas */}
      <NeuralConstellation
        state={neuralState}
        onWarpComplete={onWarpComplete}
      />


      {/* Top-left brand mark */}
      <div className="absolute top-8 left-8 z-10">
        <Link to="/" className="block hover:opacity-80 transition-opacity">
          <img src="/logo_pdc.png" alt="PDC - Por Dentro do Curso" className="h-8 w-auto brightness-0 invert opacity-50 hover:opacity-100 transition-opacity" />
        </Link>
      </div>

      {/* Top-right status */}
      <div className="absolute top-8 right-8 z-10 text-[9px] font-mono text-teal-400/20 uppercase tracking-[0.2em] text-right">
        CONSTELA<br />TION
      </div>

      {/* Bottom headline */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-8 pointer-events-none">
        {/* Gradient for text readability */}
        <div
          className="absolute bottom-0 left-0 right-0 h-56 pointer-events-none"
          style={{ background: 'linear-gradient(to top, #030e0e 40%, transparent)' }}
        />
        <div className="relative z-10">
          <h2 className="text-2xl font-black text-white/90 tracking-tight leading-tight">
            {headline}
          </h2>
          {subline && (
            <p className="mt-1.5 text-sm text-teal-400/50 font-medium">{subline}</p>
          )}
        </div>
      </div>
    </div>
  );
}
