export type PracticePhase = "horizontal" | "down" | "firstPut" | "autoPut" | "autoPutReview" | "targets" | "undoPut" | "undoBack" | "erasing" | "penalties" | "damageReady" | "damaging" | "damageReview" | "recoveryReview" | "done";
export type PracticeOutcome = { sound?: string; failed?: boolean; trick?: string; advance?: boolean; explain?: boolean; message?: string };
