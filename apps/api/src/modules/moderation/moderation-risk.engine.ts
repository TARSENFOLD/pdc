export type ModerationDecision = 'auto_approve' | 'needs_review' | 'auto_hide';
export type ModerationSeverity = 'low' | 'medium' | 'high';

export type ModerationReason =
  | 'suspicious_link'
  | 'abusive_language'
  | 'repetitive_pattern'
  | 'duplicate_recent'
  | 'low_reputation';

export interface ModerationProfile {
  id: string | number;
  createdAt?: string;
  reputacao?: number | null;
}

export interface ModerationInput {
  corpo: string;
  profile: ModerationProfile;
}

export interface ModerationRiskResult {
  decision: ModerationDecision;
  severity: ModerationSeverity;
  score: number;
  reasons: ModerationReason[];
}

export interface ModerationRiskDependencies {
  hasDuplicateRecentPost: (profile: ModerationProfile, corpo: string) => Promise<boolean>;
  now?: () => Date;
}

const RISKY_TERMS = [
  'burro',
  'idiota',
  'estupido',
  'estúpido',
  'porra',
  'merda',
  'foda',
  'kill yourself',
];

const URL_PATTERN = /https?:\/\/|www\.|bit\.ly|tinyurl\.com|t\.me\/|wa\.me\/|whatsapp\.com\/|discord\.gg\//i;
function clampScore(score: number): number {
  return Math.min(1, Math.max(0, Number(score.toFixed(2))));
}

function hasExcessiveRepetition(corpo: string): boolean {
  const normalized = corpo.toLowerCase().replace(/\s+/g, ' ').trim();
  if (/(.)\1{12,}/u.test(normalized)) return true;

  const words = normalized.split(' ').filter(Boolean);
  if (words.length < 12) return false;

  const counts = new Map<string, number>();
  for (const word of words) {
    if (word.length < 3) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return [...counts.values()].some((count) => count / words.length > 0.45);
}

function severityFromScore(score: number): ModerationSeverity {
  if (score >= 0.85) return 'high';
  if (score >= 0.35) return 'medium';
  return 'low';
}

function decisionFromScore(score: number): ModerationDecision {
  if (score >= 0.85) return 'auto_hide';
  if (score >= 0.35) return 'needs_review';
  return 'auto_approve';
}

export async function assessPostModerationRisk(
  input: ModerationInput,
  dependencies: ModerationRiskDependencies,
): Promise<ModerationRiskResult> {
  const reasons: ModerationReason[] = [];
  let score = 0;
  const corpo = input.corpo.trim();
  const lower = corpo.toLowerCase();
  if (URL_PATTERN.test(corpo)) {
    reasons.push('suspicious_link');
    score += 0.3;
  }

  if (RISKY_TERMS.some((term) => lower.includes(term))) {
    reasons.push('abusive_language');
    score += 0.45;
  }

  if (hasExcessiveRepetition(corpo)) {
    reasons.push('repetitive_pattern');
    score += 0.3;
  }

  if ((input.profile.reputacao ?? 0) < 0) {
    reasons.push('low_reputation');
    score += 0.2;
  }

  if (await dependencies.hasDuplicateRecentPost(input.profile, corpo)) {
    reasons.push('duplicate_recent');
    score += 0.35;
  }

  const normalizedScore = clampScore(score);

  return {
    decision: decisionFromScore(normalizedScore),
    severity: severityFromScore(normalizedScore),
    score: normalizedScore,
    reasons,
  };
}
