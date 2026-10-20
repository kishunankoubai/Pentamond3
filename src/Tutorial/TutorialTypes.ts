import type { OperateName } from "../Game/GameMode";

/** 説明文に、登録中の入力機器に対応する操作表示を埋め込む。 */
export type TutorialControlMarkup = (operation: OperateName) => string;

export type PracticePhase =
    | "horizontal"
    | "down"
    | "firstPut"
    | "autoPut"
    | "autoPutReview"
    | "targets"
    | "undoPut"
    | "undoBack"
    | "erasing"
    | "penalties"
    | "damageReady"
    | "damaging"
    | "damageReview"
    | "recoveryReview"
    | "done";
export type PracticeOutcome = { sound?: string; failed?: boolean; trick?: string; advance?: boolean; explain?: boolean; message?: string };
