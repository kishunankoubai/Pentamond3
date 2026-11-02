export function readGamepads(): readonly (Gamepad | null)[] {
    try {
        return navigator.getGamepads?.() ?? [];
    } catch {
        return [];
    }
}
