// The person's choice about the AI coach, kept per device (SPEC §17.3). Unset until they choose;
// either choice lets them carry on, so this never stops anyone exercising (CLAUDE.md rule 2).
export type CoachChoice = 'ai' | 'rules';

const KEY = 'rl.coach';

export function readCoachChoice(): CoachChoice | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'ai' || v === 'rules' ? v : null;
  } catch {
    return null;
  }
}

export function writeCoachChoice(choice: CoachChoice): void {
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    // storage unavailable: the choice lasts for this visit only
  }
}
