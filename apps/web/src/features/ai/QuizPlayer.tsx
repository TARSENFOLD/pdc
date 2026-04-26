import { useState } from 'react';
import { Button } from '@/components/ui';
import type { QuizPergunta } from '@pdc/shared';

interface QuizPlayerProps {
  perguntas: QuizPergunta[];
  onConcluir?: (score: number, total: number) => void;
}

export function QuizPlayer({ perguntas, onConcluir }: QuizPlayerProps) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const pergunta: QuizPergunta | undefined = perguntas[current];

  if (!pergunta || finished) {
    const total = perguntas.length;
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border border-ink-tertiary/10 bg-elevated p-8 text-center">
        <h2 className="text-xl font-bold text-ink-primary">Quiz Concluído</h2>
        <p className="text-4xl font-bold text-accent">{score}/{total}</p>
        <p className="text-sm text-ink-tertiary">
          {score === total ? 'Perfeito!' : score >= total / 2 ? 'Bom trabalho!' : 'Continua a estudar!'}
        </p>
        {onConcluir && (
          <Button onClick={() => { onConcluir(score, total); }}>Concluir</Button>
        )}
      </div>
    );
  }

  const p = pergunta;
  const isCorrect = selected === p.respostaCorrecta;
  const answered = selected !== null;

  function handleSelect(index: number) {
    if (answered) return;
    setSelected(index);
    if (index === p.respostaCorrecta) {
      setScore((s) => s + 1);
    }
  }

  function handleNext() {
    setSelected(null);
    if (current + 1 >= perguntas.length) {
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
    }
  }

  return (
    <div className="rounded-lg border border-ink-tertiary/10 bg-elevated p-6">
      {/* Progress */}
      <div className="mb-4 flex items-center justify-between text-xs text-ink-tertiary">
        <span>Pergunta {current + 1} de {perguntas.length}</span>
        <span>{score} corretas</span>
      </div>

      {/* Question */}
      <h3 className="mb-6 text-lg font-semibold text-ink-primary">{p.pergunta}</h3>

      {/* Options */}
      <div className="mb-6 space-y-3">
        {p.opcoes.map((opcao: string, i: number) => {
          let classes = 'w-full rounded-lg border px-4 py-3 text-left text-sm transition-colors ';
          if (!answered) {
            classes += 'border-ink-tertiary/10 text-ink-secondary hover:border-accent hover:text-ink-primary cursor-pointer';
          } else if (i === p.respostaCorrecta) {
            classes += 'border-green-500 bg-green-500/10 text-green-400';
          } else if (i === selected) {
            classes += 'border-red-500 bg-red-500/10 text-red-400';
          } else {
            classes += 'border-ink-tertiary/10 text-ink-tertiary opacity-50';
          }

          return (
            <button key={i} onClick={() => { handleSelect(i); }} disabled={answered} className={classes}>
              <span className="mr-2 font-semibold">{String.fromCharCode(65 + i)}.</span>
              {opcao}
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {answered && (
        <div className={`mb-4 rounded-lg p-4 text-sm ${isCorrect ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
          <p className="mb-1 font-semibold">{isCorrect ? 'Correto!' : 'Incorreto'}</p>
          <p className="text-ink-secondary">{p.explicacao}</p>
        </div>
      )}

      {/* Next */}
      {answered && (
        <div className="flex justify-end">
          <Button onClick={handleNext}>
            {current + 1 >= perguntas.length ? 'Ver resultado' : 'Próxima'}
          </Button>
        </div>
      )}
    </div>
  );
}
