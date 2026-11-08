// Daily check-in with the adaptive coach (SPEC §17). The person says how they feel; the plan fits
// today. Red flags show advice, never a block (CLAUDE.md rule 2), and every plan shows why.
import { AlertTriangle, ChevronDown, Loader2, Play, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { coachDeps } from '../../api/coach';
import {
  ADAPTATIONS,
  type Barrier,
  type CheckIn,
  type CoachOutcome,
  type Energy,
  type LibraryEntry,
  type PlanItem,
  redact,
  runCheckIn,
} from '../../coach';
import { exerciseName } from '../../i18n';
import { useApp } from '../../lib/appContext';
import { type CoachChoice, readCoachChoice, writeCoachChoice } from '../../lib/coachPrefs';
import { cn } from '../../lib/format';
import { voice } from '../../voice/voiceEngine';
import { Badge, Button, Card, CardTitle, PainSlider } from '../ui';

const MINUTES = [5, 10, 20, 30];
const ENERGIES: Energy[] = ['low', 'ok', 'high'];
const LAST_KEY = 'rl.coach.last';

interface Saved {
  day: string;
  pain: number;
  outcome: CoachOutcome;
}

function readSaved(): Saved | null {
  try {
    const s = JSON.parse(localStorage.getItem(LAST_KEY) ?? 'null') as Saved | null;
    return s && s.day === new Date().toDateString() && s.outcome?.kind === 'plan' ? s : null;
  } catch {
    return null;
  }
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'min-h-11 rounded-xl border px-3 text-sm font-medium',
        pressed ? 'border-teal bg-teal-soft text-teal-dark' : 'border-line bg-white',
      )}
    >
      {children}
    </button>
  );
}

export function CoachCheckIn({
  library,
  onUsualProgramme,
  preset = null,
  aiAllowed = true,
}: {
  library: LibraryEntry[];
  onUsualProgramme: () => void;
  /** Barrier from the comeback card: a smaller session, recorded with the check-in. */
  preset?: Barrier | null;
  /** False when the physiotherapist has switched the AI coach off for this patient. */
  aiAllowed?: boolean;
}) {
  const { t, lang, patientId } = useApp();
  const navigate = useNavigate();
  const ids = { text: useId(), hint: useId(), result: useId() };
  const resultRef = useRef<HTMLHeadingElement>(null);

  const [choice, setChoice] = useState<CoachChoice | null>(readCoachChoice);
  const [text, setText] = useState('');
  const [minutes, setMinutes] = useState<number | null>(null);
  const [energy, setEnergy] = useState<Energy | null>(null);
  const [pain, setPain] = useState(2);
  const [redFlag, setRedFlag] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const saved = useMemo(readSaved, []);
  const [outcome, setOutcome] = useState<CoachOutcome | null>(saved?.outcome ?? null);
  const [outcomePain, setOutcomePain] = useState(saved?.pain ?? 2);

  const useAi = choice === 'ai' && aiAllowed;

  useEffect(() => {
    if (!preset) return;
    setMinutes(ADAPTATIONS[preset].minutes);
    setEnergy(ADAPTATIONS[preset].energy);
    setOutcome(null);
    setRedFlag(null);
  }, [preset]);
  const sent = redact(text);

  useEffect(() => {
    if (outcome && !saved) resultRef.current?.focus();
  }, [outcome, saved]);

  const choose = (c: CoachChoice) => {
    writeCoachChoice(c);
    setChoice(c);
  };

  const submit = async () => {
    // The question bundles several signs, so a "yes" goes straight to the advice, with no model call.
    if (redFlag) {
      setOutcome({ kind: 'red_flag', flags: [] });
      return;
    }
    const checkIn: CheckIn = { text, pain, redFlags: [], minutes, energy, barriers: preset ? [preset] : undefined };
    setBusy(true);
    try {
      const out = await runCheckIn(checkIn, {
        library,
        language: lang,
        useAi,
        deps: coachDeps(patientId ?? undefined),
        technique: preset ? ADAPTATIONS[preset].technique : undefined,
      });
      setOutcome(out);
      setOutcomePain(pain);
      if (out.kind === 'plan') {
        try {
          localStorage.setItem(LAST_KEY, JSON.stringify({ day: new Date().toDateString(), pain, outcome: out } satisfies Saved));
        } catch {
          // best-effort cache for offline use
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setOutcome(null);
    setRedFlag(null);
  };

  const start = (item: PlanItem) => {
    voice.unlock(); // this tap is the gesture iOS needs before speech (SPEC §6.1)
    navigate(`/mirror/${item.exerciseId}?sets=${item.sets}&reps=${item.reps}`, {
      state: { painBefore: outcomePain, painConfirmed: true, patientId },
    });
  };

  const aiToggle = !aiAllowed ? (
    <span className="text-xs text-navy-soft">{t('checkin.ai_off_by_physio')}</span>
  ) : choice && (
    <button
      type="button"
      role="switch"
      aria-checked={useAi}
      onClick={() => choose(useAi ? 'rules' : 'ai')}
      className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border border-line px-2.5 text-xs font-medium text-navy-soft hover:bg-teal-soft"
    >
      <span aria-hidden className={cn('relative h-4 w-7 rounded-full transition-colors', useAi ? 'bg-teal' : 'bg-navy/25')}>
        <span className={cn('absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all', useAi ? 'left-3.5' : 'left-0.5')} />
      </span>
      {useAi ? t('checkin.ai_on') : t('checkin.ai_off')}
    </button>
  );

  return (
    <Card>
      <CardTitle icon={<Sparkles size={18} />} action={aiToggle}>
        {t('checkin.title')}
      </CardTitle>

      {!choice && aiAllowed ? (
        <div className="rounded-2xl bg-teal-soft/60 p-4">
          <h3 className="font-semibold text-navy">{t('checkin.consent_title')}</h3>
          <p className="mt-1 text-sm text-navy-soft">{t('checkin.consent_body')}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={() => choose('ai')}>
              <Sparkles size={16} /> {t('checkin.consent_ai')}
            </Button>
            <Button variant="secondary" className="flex-1" onClick={() => choose('rules')}>
              <ShieldCheck size={16} /> {t('checkin.consent_rules')}
            </Button>
          </div>
        </div>
      ) : outcome ? (
        <Result
          outcome={outcome}
          headingId={ids.result}
          headingRef={resultRef}
          onStart={start}
          onAgain={reset}
          onUsualProgramme={() => {
            reset();
            onUsualProgramme();
          }}
        />
      ) : (
        <div className="space-y-5">
          {preset && <Badge tone="teal">{t('comeback.preset', { barrier: t(`comeback.barrier.${preset}`) })}</Badge>}
          <p className="text-sm text-navy-soft">{t('checkin.subtitle')}</p>
          <div>
            <label htmlFor={ids.text} className="mb-1.5 block text-sm font-medium text-navy-soft">
              {t('checkin.text_label')}
            </label>
            <textarea
              id={ids.text}
              aria-describedby={ids.hint}
              value={text}
              maxLength={500}
              rows={2}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('checkin.text_placeholder')}
              className="w-full rounded-xl border border-line bg-white p-3 text-base focus:border-teal"
            />
            <p id={ids.hint} className="mt-1 text-xs text-navy-soft">
              {t('checkin.text_hint')}
            </p>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-navy-soft">{t('checkin.minutes')}</legend>
            <div className="grid grid-cols-4 gap-2">
              {MINUTES.map((m) => (
                <Chip key={m} pressed={minutes === m} onClick={() => setMinutes(minutes === m ? null : m)}>
                  {t('checkin.minutes_n', { n: m })}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-navy-soft">{t('checkin.energy')}</legend>
            <div className="grid grid-cols-3 gap-2">
              {ENERGIES.map((e) => (
                <Chip key={e} pressed={energy === e} onClick={() => setEnergy(energy === e ? null : e)}>
                  {t(`checkin.energy_${e}`)}
                </Chip>
              ))}
            </div>
          </fieldset>

          <PainSlider value={pain} onChange={setPain} label={t('pain.now')} />

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-navy-soft">{t('checkin.red_flags')}</legend>
            <div className="grid grid-cols-2 gap-3">
              <Chip pressed={redFlag === false} onClick={() => setRedFlag(false)}>
                {t('common.no')}
              </Chip>
              <Chip pressed={redFlag === true} onClick={() => setRedFlag(true)}>
                {t('common.yes')}
              </Chip>
            </div>
          </fieldset>

          {useAi && (
            <div className="rounded-xl bg-navy/5 p-3 text-sm">
              <div className="font-medium text-navy">{t('checkin.sent_label')}</div>
              <p className="mt-1 break-words text-navy-soft">{sent.text ? `“${sent.text}”` : t('checkin.sent_none')}</p>
              {sent.removed > 0 && <p className="mt-1 text-xs text-navy-soft">{t('checkin.sent_removed', { n: sent.removed })}</p>}
            </div>
          )}

          <Button size="lg" className="w-full" onClick={submit} disabled={redFlag === null || busy}>
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} {busy ? t('checkin.making') : t('checkin.make_plan')}
          </Button>
        </div>
      )}
    </Card>
  );
}

function Result({
  outcome,
  headingId,
  headingRef,
  onStart,
  onAgain,
  onUsualProgramme,
}: {
  outcome: CoachOutcome;
  headingId: string;
  headingRef: React.RefObject<HTMLHeadingElement>;
  onStart: (item: PlanItem) => void;
  onAgain: () => void;
  onUsualProgramme: () => void;
}) {
  const { t } = useApp();
  const [open, setOpen] = useState(false);
  const name = (id: string | null) => (id ? exerciseName(t, id) : '');

  if (outcome.kind === 'red_flag') {
    return (
      <div aria-live="polite">
        <h3 id={headingId} ref={headingRef} tabIndex={-1} className="font-semibold text-navy">
          {t('checkin.red_title')}
        </h3>
        <div className="mt-3 flex gap-3 rounded-xl bg-amber-50 p-4 text-amber-900">
          <AlertTriangle className="shrink-0" aria-hidden />
          <p>
            {outcome.flags.length
              ? t('checkin.red_body', { flags: outcome.flags.map((f) => t(`checkin.flag.${f}`)).join(', ') })
              : t('checkin.red_body_general')}
          </p>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button variant="secondary" className="flex-1" onClick={onAgain}>
            {t('pain.skip_today')}
          </Button>
          <Button className="flex-1" onClick={onUsualProgramme}>
            {t('checkin.red_usual')}
          </Button>
        </div>
      </div>
    );
  }

  const { result, source, model, fallback } = outcome;
  const items = result.plan.items;
  const why = result.plan.why || (result.plan.whyKey ? t(result.plan.whyKey) : '');

  return (
    <div aria-live="polite">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={headingId} ref={headingRef} tabIndex={-1} className="font-semibold text-navy">
          {t('checkin.plan_title')}
        </h3>
        {items.length > 0 && (
          <Badge tone="teal">{result.minutes <= 1 ? t('checkin.plan_minute') : t('checkin.plan_minutes', { n: result.minutes })}</Badge>
        )}
      </div>
      {why && <p className="mt-2 text-navy-soft">{why}</p>}

      {items.length === 0 ? (
        <p className="mt-3 rounded-xl bg-navy/5 p-3 text-sm text-navy-soft">{t('checkin.empty')}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((it) => (
            <li key={it.exerciseId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3">
              <div className="min-w-0">
                <div className="font-medium">{name(it.exerciseId)}</div>
                <div className="text-sm text-navy-soft">
                  {it.holdSeconds
                    ? it.sets === 1
                      ? t('plan.one_set_hold', { seconds: it.holdSeconds })
                      : t('plan.sets_hold', { sets: it.sets, seconds: it.holdSeconds })
                    : it.sets === 1
                      ? t('plan.one_set_reps', { reps: it.reps })
                      : t('plan.sets_reps', { sets: it.sets, reps: it.reps })}
                </div>
              </div>
              <Button size="sm" onClick={() => onStart(it)}>
                <Play size={16} className="fill-current" /> {t('checkin.start')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 rounded-xl border border-line">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm font-medium text-navy"
        >
          {t('checkin.why_title')}
          <ChevronDown size={18} aria-hidden className={cn('transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="space-y-3 border-t border-line p-3 text-sm text-navy-soft">
            <p>{source === 'model' ? t('checkin.source_model', { model: model ?? '' }) : fallback ? t('checkin.source_fallback') : t('checkin.source_rules')}</p>
            <p>
              <span className="font-medium text-navy">{t('checkin.technique_label')}:</span> {t(`checkin.technique.${result.plan.technique}`)}
            </p>
            <div>
              <div className="font-medium text-navy">{t('checkin.changes_title')}</div>
              {result.changes.length === 0 ? (
                <p>{t('checkin.changes_none')}</p>
              ) : (
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {result.changes.map((c, i) => (
                    <li key={i}>{t(`checkin.change.${c.reason}`, { exercise: name(c.exerciseId), from: c.from ?? '', to: c.to ?? '' })}</li>
                  ))}
                </ul>
              )}
            </div>
            <p className="text-xs">{t('checkin.limits')}</p>
          </div>
        )}
      </div>

      <Button variant="secondary" className="mt-4 w-full" onClick={onAgain}>
        {t('checkin.again')}
      </Button>
    </div>
  );
}
