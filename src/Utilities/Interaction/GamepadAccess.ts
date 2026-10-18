/** 未対応・権限制限の環境でも、キーボード操作や起動を妨げない。 */
export function readGamepads(): readonly (Gamepad | null)[] {
    try { return navigator.getGamepads?.() ?? []; }
    catch { return []; }
}
