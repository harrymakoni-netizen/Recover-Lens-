// Best-effort removal of contact details before check-in text leaves the device (SPEC §17.3).
// Names cannot be detected reliably, so the check-in also asks people not to type them.

export const MAX_CHECKIN_CHARS = 500;

const RULES: Array<[RegExp, string]> = [
  [/\b[\w.+-]+@[\w-]+(\.[\w-]+)+\b/g, '[email]'],
  [/\b(?:https?:\/\/|www\.)[^\s,;)]*[^\s,;).]/gi, '[link]'],
  // 7 or more digits, allowing spaces, dashes, dots and a leading +: phone or ID numbers.
  [/\+?\d[\d\s.-]{5,}\d/g, '[number]'],
];

export function redact(text: string): { text: string; removed: number } {
  let out = text;
  let removed = 0;
  for (const [re, label] of RULES) {
    out = out.replace(re, () => {
      removed++;
      return label;
    });
  }
  out = out.replace(/\s+/g, ' ').trim().slice(0, MAX_CHECKIN_CHARS);
  return { text: out, removed };
}
