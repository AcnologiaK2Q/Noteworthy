export type ReviewGrade = "again" | "hard" | "good" | "easy";

/** SM-2 quality scores for the four review buttons. */
const QUALITY: Record<ReviewGrade, number> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

export interface SchedulingState {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

export interface SchedulingResult extends SchedulingState {
  dueAt: Date;
}

/**
 * Standard SM-2. A failed card resets its repetition streak and comes back in
 * the same session; a passed card grows its interval by the ease factor.
 */
export function scheduleNextReview(
  current: SchedulingState,
  grade: ReviewGrade,
  now: Date = new Date(),
): SchedulingResult {
  const quality = QUALITY[grade];

  let { easeFactor, intervalDays, repetitions } = current;

  if (quality < 3) {
    repetitions = 0;
    intervalDays = 0;
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
  }

  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  const dueAt = new Date(now);
  if (intervalDays === 0) dueAt.setMinutes(dueAt.getMinutes() + 10);
  else dueAt.setDate(dueAt.getDate() + intervalDays);

  return { easeFactor, intervalDays, repetitions, dueAt };
}
