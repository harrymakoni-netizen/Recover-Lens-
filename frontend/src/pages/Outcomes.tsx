// Outcome simulation (SPEC §17.6). Simulated people, labelled as such everywhere (CLAUDE.md rule 8):
// how the adaptive loop behaves under stated assumptions, not evidence that it works on people.
import { FlaskConical, Info, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardTitle } from '../components/ui';
import { useApp } from '../lib/appContext';
import run from '../sim/validatorRun.json';
import { ARCHETYPES, ARMS, type Arm, DEFAULT_ASSUMPTIONS as A, pessimistic, simulate } from '../sim/cohort';

const COLORS: Record<Arm, string> = { static: '#8A94A6', reminders: '#3B6FB6', recoverlens: '#0E8C7A' };
const pct = (v: number) => `${Math.round(v * 100)}%`;
const range = (vals: number[]) => `${pct(Math.min(...vals))}–${pct(Math.max(...vals))}`;

export default function Outcomes() {
  const { t } = useApp();
  const main = useMemo(() => simulate(), []);
  const low = useMemo(() => simulate({ assumptions: pessimistic(A) }), []);
  const armName = (a: Arm) => t(`out.arm.${a}`);
  const data = Array.from({ length: 12 }, (_, w) => ({
    week: t('out.week_n', { n: w + 1 }),
    ...Object.fromEntries(ARMS.map((a) => [armName(a), Math.round(main.arms[a].persistence[w] * 100)])),
  }));
  const metrics: Array<{ key: string; value: (a: Arm, r: typeof main) => string }> = [
    { key: 'persistence', value: (a, r) => pct(r.arms[a].retention) },
    { key: 'return', value: (a, r) => pct(r.arms[a].returnAfterLapse) },
    { key: 'rom', value: (a, r) => t('out.degrees', { n: r.arms[a].functionalChange.toFixed(1) }) },
    { key: 'equity', value: (a, r) => t('out.points', { n: Math.round(r.arms[a].equityGap) }) },
  ];
  const nudgeEffects = ARCHETYPES.flatMap((k) => Object.values(A.nudgeEffect[k]));
  const WEEKS = [4, 8, 12] as const;
  // Every week and measure where RecoverLens is not ahead of another arm, in either run (plan §6.3).
  const notAhead = [
    { run: 'main', r: main },
    { run: 'cautious', r: low },
  ].flatMap(({ run, r }) =>
    WEEKS.flatMap((wk) =>
      ARMS.filter((a) => a !== 'recoverlens').flatMap((a) => {
        const rl = r.arms.recoverlens;
        const other = r.arms[a];
        const out: string[] = [];
        if (rl.persistence[wk - 1] <= other.persistence[wk - 1])
          out.push(t('out.behind.persistence', { week: wk, arm: armName(a), rl: pct(rl.persistence[wk - 1]), other: pct(other.persistence[wk - 1]) }));
        if (Math.round(rl.equityGapWeekly[wk - 1]) > Math.round(other.equityGapWeekly[wk - 1]))
          out.push(t('out.behind.gap', { week: wk, arm: armName(a), rl: Math.round(rl.equityGapWeekly[wk - 1]), other: Math.round(other.equityGapWeekly[wk - 1]) }));
        return out.map((line) => (run === 'cautious' ? `${t('out.cautious_run')}: ${line}` : line));
      }),
    ),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t('out.title')}</h1>
        <p className="mt-1 text-navy-soft">{t('out.lead', { people: main.people })}</p>
      </div>

      <div role="note" className="flex gap-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-950">
        <FlaskConical className="mt-0.5 shrink-0" aria-hidden />
        <p>
          <strong>{t('out.banner_label')}</strong> {t('out.banner')}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {ARMS.map((a) => (
          <Card key={a} className={a === 'recoverlens' ? 'ring-2 ring-teal/40' : undefined}>
            <div className="flex items-center gap-2">
              <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: COLORS[a] }} />
              <h2 className="font-semibold text-navy">{armName(a)}</h2>
            </div>
            <p className="mt-1 text-sm text-navy-soft">{t(`out.arm_desc.${a}`)}</p>
            <dl className="mt-4 space-y-3">
              {metrics.map((m) => (
                <div key={m.key}>
                  <dt className="text-xs text-navy-soft">{t(`out.metric.${m.key}`)}</dt>
                  <dd className="text-2xl font-semibold tabular-nums">{m.value(a, main)}</dd>
                  {a === 'recoverlens' && <dd className="text-xs text-navy-soft">{t('out.cautious', { value: m.value(a, low) })}</dd>}
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle>{t('out.persistence_title')}</CardTitle>
        <div className="h-72" role="img" aria-label={t('out.chart_desc', { values: ARMS.map((a) => `${armName(a)} ${pct(main.arms[a].retention)}`).join(', ') })}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: -8 }}>
              <CartesianGrid stroke="#E9EDF3" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#5B6680' }} interval="preserveStartEnd" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#5B6680' }} unit="%" />
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend />
              {ARMS.map((a) => (
                <Line key={a} type="monotone" dataKey={armName(a)} stroke={COLORS[a]} strokeWidth={a === 'recoverlens' ? 3 : 2} dot={false} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardTitle>{t('out.weeks_title')}</CardTitle>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={t('out.weeks_title')}>
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-navy-soft">
                <th scope="col" rowSpan={2} className="py-2 pr-3 align-bottom font-medium">
                  {t('out.arm_col')}
                </th>
                <th scope="colgroup" colSpan={3} className="pt-2 pr-3 text-right font-medium">
                  {t('out.col_active')}
                </th>
                <th scope="colgroup" colSpan={3} className="pt-2 pr-3 text-right font-medium">
                  {t('out.col_gap')}
                </th>
              </tr>
              <tr className="text-right text-navy-soft">
                {[...WEEKS, ...WEEKS].map((wk, i) => (
                  <th key={i} scope="col" className="pb-2 pr-3 font-medium">
                    {t('out.week_n', { n: wk })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ARMS.map((a) => (
                <tr key={a} className="border-t border-line">
                  <th scope="row" className="py-2 pr-3 text-left font-medium">
                    {armName(a)}
                  </th>
                  {WEEKS.map((wk) => (
                    <td key={`p${wk}`} className="py-2 pr-3 text-right tabular-nums">
                      {pct(main.arms[a].persistence[wk - 1])}
                    </td>
                  ))}
                  {WEEKS.map((wk) => (
                    <td key={`g${wk}`} className="py-2 pr-3 text-right tabular-nums">
                      {t('out.points', { n: Math.round(main.arms[a].equityGapWeekly[wk - 1]) })}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-navy-soft">{t('out.gap_note')}</p>
        <h3 className="mt-5 text-sm font-semibold text-navy">{t('out.behind_title')}</h3>
        {notAhead.length ? (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-navy-soft">
            {notAhead.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-navy-soft">{t('out.behind_none')}</p>
        )}
      </Card>

      <Card>
        <CardTitle>{t('out.groups_title')}</CardTitle>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={t('out.groups_title')}>
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="text-left text-navy-soft">
                <th scope="col" className="py-2 pr-3 font-medium">{t('out.group')}</th>
                {ARMS.map((a) => (
                  <th key={a} scope="col" className="py-2 pr-3 text-right font-medium">
                    {armName(a)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ARCHETYPES.map((k) => (
                <tr key={k} className="border-t border-line">
                  <th scope="row" className="py-2 pr-3 text-left font-medium">
                    {t(`out.group.${k}`)}
                  </th>
                  {ARMS.map((a) => (
                    <td key={a} className="py-2 pr-3 text-right tabular-nums">
                      {pct(main.arms[a].byArchetype[k])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-navy-soft">{t('out.bandit', { share: pct(main.arms.recoverlens.bestNudgeShare ?? 0) })}</p>
      </Card>

      <Card>
        <CardTitle icon={<ShieldCheck size={18} />}>{t('out.safety_title')}</CardTitle>
        <p className="text-sm text-navy-soft">{t('out.safety_intro', { n: run.checkIns, date: run.date, model: run.models.join(', ') })}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['red', run.redFlagRules + run.redFlagModel],
            ['plans', run.modelPlans],
            ['changed', run.modelPlansChanged],
            ['fallback', run.rulesFallback],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-page p-3">
              <dt className="text-xs text-navy-soft">{t(`out.safety.${k}`)}</dt>
              <dd className="text-2xl font-semibold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-navy-soft">
          {t('out.safety_red_split', { rules: run.redFlagRules, model: run.redFlagModel })} {t('out.safety_note')}
        </p>
        <details className="mt-3 text-sm">
          <summary className="min-h-10 cursor-pointer py-2 font-medium text-teal-dark">{t('out.safety_details')}</summary>
          <ul className="mt-2 space-y-1.5">
            {run.rows.map((r, i) => (
              <li key={i} className="rounded-lg bg-page px-3 py-2">
                <span lang={r.language}>“{r.text}”</span>
                <span className="block text-xs text-navy-soft">
                  {t(`out.safety_outcome.${r.outcome}`)}
                  {r.changes.length ? ` · ${t('out.safety_changed_by', { reasons: [...new Set(r.changes)].map((c) => t(`out.reason.${c}`)).join(', ') })}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle icon={<Info size={18} />}>{t('out.assumptions_title')}</CardTitle>
          <ul className="list-disc space-y-2 pl-5 text-sm text-navy-soft">
            <li>{t('out.a.start', { range: range(Object.values(A.startDaily)) })}</li>
            <li>{t('out.a.decay', { pct: `${(A.decayPerDay * 100).toFixed(1)}%`, cut: pct(A.adaptiveDecayCut) })}</li>
            <li>{t('out.a.return', { base: pct(A.baseReturn), rem: pct(A.reminderBoost), fat: pct(A.reminderFatiguePerWeek) })}</li>
            <li>{t('out.a.barrier', { answered: pct(A.barrierAnswered), boost: pct(A.barrierBoost) })}</li>
            <li>{t('out.a.nudge', { range: range(nudgeEffects) })}</li>
            <li>{t('out.a.rom', { per: A.romPerSession, ceiling: A.romCeiling })}</li>
            <li>{t('out.a.lapse', { days: A.lapseDays })}</li>
          </ul>
        </Card>
        <Card>
          <CardTitle>{t('out.limits_title')}</CardTitle>
          <p className="text-sm text-navy-soft">{t('out.limits')}</p>
        </Card>
      </div>
    </div>
  );
}
