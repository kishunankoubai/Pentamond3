import { globalValues } from "../Global";
import { advancedLessonOffset, advancedLessons } from "./AdvancedLessons";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const lessonCount = advancedLessonOffset + advancedLessons.length;
/** 17項目のクリア状態を3文字のビットマスクに保存する。 */
export class TutorialProgress {
    static readonly storageKey = "Pentamond3-tutorial";
    private static cleared = 0;
    static read(): void {
        this.cleared = 0;
        if (globalValues.nosave) return;
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return;
            if (/^1:[A-Za-z0-9+/]$/.test(raw)) this.cleared = alphabet.indexOf(raw[2]);
            else if (/^2:[A-Za-z0-9+/]{2}$/.test(raw) && alphabet.indexOf(raw[3]) < 32)
                this.cleared = alphabet.indexOf(raw[2]) | alphabet.indexOf(raw[3]) << 6;
            else if (/^3:[A-Za-z0-9+/]{3}$/.test(raw) && alphabet.indexOf(raw[4]) < 32)
                this.cleared = alphabet.indexOf(raw[2]) | alphabet.indexOf(raw[3]) << 6 | alphabet.indexOf(raw[4]) << 12;
            else throw new Error("未対応の教習記録です");
        } catch (error) { console.warn("教習記録を読み込めませんでした", error); }
    }
    static isCleared(index: number): boolean { return Number.isInteger(index) && index >= 0 && index < lessonCount && !!(this.cleared & (1 << index)); }
    static isUnlocked(index: number): boolean { return Number.isInteger(index) && index >= 0 && index < lessonCount && (index === 0 || index === 6 || index === advancedLessonOffset || this.isCleared(index) || this.isCleared(index - 1)); }
    static complete(index: number): void {
        if (!Number.isInteger(index) || index < 0 || index >= lessonCount) return;
        this.cleared |= 1 << index;
        if (globalValues.nosave) return;
        try { localStorage.setItem(this.storageKey, "3:" + alphabet[this.cleared & 63] + alphabet[this.cleared >> 6 & 63] + alphabet[this.cleared >> 12]); }
        catch (error) { console.warn("教習記録を保存できませんでした。今回の起動中は保持します。", error); }
    }
    static reset(): void {
        localStorage.removeItem(this.storageKey);
        this.cleared = 0;
    }
    static getDataSize(): number {
        try { return new Blob([localStorage.getItem(this.storageKey) ?? ""]).size; }
        catch { return 0; }
    }
}
