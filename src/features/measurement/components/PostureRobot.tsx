import type { MeasurementPosture } from '../domain/ppgPolicy';

interface PostureRobotProps {
  posture: MeasurementPosture;
}

export function PostureRobot({ posture }: PostureRobotProps) {
  const transform = posture === 'lying'
    ? 'translate(6 80) rotate(-90 54 48)'
    : posture === 'seated'
      ? 'translate(6 12)'
      : 'translate(6 2)';

  return (
    <svg aria-hidden="true" className={`posture-robot posture-robot--${posture}`} viewBox="0 0 120 120">
      <g transform={transform}>
        <rect className="robot-head" height="34" rx="12" width="48" x="30" y="8" />
        <circle className="robot-eye" cx="44" cy="25" r="4" />
        <circle className="robot-eye" cx="64" cy="25" r="4" />
        <path className="robot-body" d="M38 46h32l6 37H32z" />
        <path className="robot-line" d={posture === 'seated' ? 'M40 80v14h22M67 80v14h19' : 'M42 80v25M66 80v25'} />
        <path className="robot-line" d="M34 54 20 73M72 54l14 19" />
        <path className="robot-bolt" d="m53 51-7 13h7l-3 12 12-17h-7l4-8z" />
      </g>
      {posture === 'seated' && <path className="robot-support" d="M67 84h25v25M92 98H72" />}
      {posture === 'lying' && <path className="robot-support" d="M12 101h96M15 88v13M105 88v13" />}
    </svg>
  );
}
