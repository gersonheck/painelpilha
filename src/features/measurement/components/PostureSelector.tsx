import type { MeasurementPosture } from '../domain/ppgPolicy';
import { PostureRobot } from './PostureRobot';

const options: Array<{ posture: MeasurementPosture; label: string; hint: string }> = [
  { posture: 'lying', label: 'Deitado', hint: 'Corpo apoiado e imóvel.' },
  { posture: 'seated', label: 'Sentado', hint: 'Costas e braço apoiados.' },
  { posture: 'standing', label: 'Em pé', hint: 'Pés firmes e sem caminhar.' },
];

interface PostureSelectorProps {
  value: MeasurementPosture | null;
  onChange(posture: MeasurementPosture): void;
}

export function PostureSelector({ value, onChange }: PostureSelectorProps) {
  return (
    <fieldset className="posture-fieldset">
      <legend>Como você está agora?</legend>
      <p>Escolha a postura que conseguirá manter durante os 60 segundos da coleta.</p>
      <div className="posture-grid">
        {options.map((option) => (
          <button
            aria-pressed={value === option.posture}
            className={`posture-option ${value === option.posture ? 'selected' : ''}`}
            key={option.posture}
            onClick={() => onChange(option.posture)}
            type="button"
          >
            <PostureRobot posture={option.posture} />
            <strong>{option.label}</strong>
            <span>{option.hint}</span>
          </button>
        ))}
      </div>
      {value && (
        <p className="posture-ready" role="status">
          <span aria-hidden="true">✓</span> Postura registrada. O próximo passo será iniciar uma janela completa de 60 segundos.
        </p>
      )}
    </fieldset>
  );
}
