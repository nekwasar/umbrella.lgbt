import { prisma } from '../db/prisma';

export type QuestionLogAction = 'created' | 'edited' | 'removed' | 'restored';

export interface QuestionLogActor {
  /** User.id or Admin.id at time of action. */
  id?: string | null;
  /** Username at time of action (denormalized for display). */
  name?: string | null;
  kind: 'user' | 'admin' | 'seed';
}

/**
 * Append a row to the Q&A audit log. Never throws: a logging failure must not
 * break the request or seed that triggered it.
 */
export async function logQuestionAction(opts: {
  questionId: string;
  action: QuestionLogAction;
  actor?: QuestionLogActor | null;
  detail?: string | null;
}): Promise<void> {
  try {
    await prisma.questionLog.create({
      data: {
        questionId: opts.questionId,
        action: opts.action,
        detail: opts.detail ?? null,
        actorId: opts.actor?.id ?? null,
        actorName: opts.actor?.name ?? null,
        actorKind: opts.actor?.kind ?? null
      }
    });
  } catch (err) {
    console.warn(
      `[question-log] failed to log "${opts.action}" for ${opts.questionId}:`,
      (err as Error).message
    );
  }
}
