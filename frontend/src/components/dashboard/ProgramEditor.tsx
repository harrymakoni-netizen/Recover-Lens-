// Pick exercises from the registry with sets/reps (Add Patient modal and Patient Detail).
import { Plus, Trash2 } from 'lucide-react';
import { LIBRARY, defaultTargetAngle, exerciseName } from '../../exercises';
import { inputClass } from '../ui';

export interface ProgramDraft {
  exercise_id: string;
  sets: number;
  reps: number;
  target_angle: number | null;
}

export const draftFor = (id: string): ProgramDraft => {
  const ex = LIBRARY.find((e) => e.id === id)!;
  return { exercise_id: id, sets: ex.defaultSets, reps: ex.defaultReps, target_angle: defaultTargetAngle(id) };
};

export function ProgramEditor({ value, onChange }: { value: ProgramDraft[]; onChange: (v: ProgramDraft[]) => void }) {
  const unused = LIBRARY.filter((e) => !value.some((v) => v.exercise_id === e.id));
  const update = (i: number, patch: Partial<ProgramDraft>) => onChange(value.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  return (
    <div className="space-y-2">
      {value.length === 0 && <p className="text-sm text-navy-soft">No exercises assigned.</p>}
      {value.map((p, i) => (
        <div key={p.exercise_id} className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_2.75rem] items-end gap-2 rounded-xl bg-page p-2">
          <div className="min-w-0 self-center truncate pl-1 font-medium">{exerciseName(p.exercise_id)}</div>
          <label className="text-xs text-navy-soft">
            Sets
            <input className={inputClass} type="number" min={1} max={10} value={p.sets} onChange={(e) => update(i, { sets: Number(e.target.value) })} />
          </label>
          <label className="text-xs text-navy-soft">
            Reps
            <input className={inputClass} type="number" min={1} max={50} value={p.reps} onChange={(e) => update(i, { reps: Number(e.target.value) })} />
          </label>
          <button
            type="button"
            aria-label={`Remove ${exerciseName(p.exercise_id)}`}
            className="flex h-11 items-center justify-center rounded-xl text-navy-soft hover:bg-alert-soft hover:text-alert"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
          >
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      {unused.length > 0 && (
        <label className="flex items-center gap-2">
          <Plus size={18} className="text-teal" />
          <select
            className={inputClass}
            value=""
            onChange={(e) => e.target.value && onChange([...value, draftFor(e.target.value)])}
            aria-label="Add exercise"
          >
            <option value="">Add an exercise…</option>
            {unused.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} {e.tracking === 'guided' ? '(guided timer)' : ''}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
