import type { OperateName } from "./GameMode";

/** 順番はリプレイ形式v2の操作IDでもあるため変更しない。 */
export const operationKeyCodes: Record<OperateName, string> = {
    "move-left": "ArrowLeft", "move-right": "ArrowRight", put: "ArrowUp", "move-down": "ArrowDown",
    "spin-left": "KeyC", "spin-right": "KeyV", unput: "KeyB", hold: "Space", removeLine: "Enter",
};

export const replayKeyCodes = Object.values(operationKeyCodes);
