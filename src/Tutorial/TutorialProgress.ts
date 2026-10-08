import { globalValues } from "../Global";
import { tutorialLessonCount, tutorialUnits } from "./TutorialUnits";
import { PageNotice } from "../Utilities/Feedback/PageNotice";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const lessonCount = tutorialLessonCount;
/** 25項目のクリア状態を5文字のビットマスクに保存する。 */
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
            else if (/^4:[A-Za-z0-9+/]{5}$/.test(raw) && alphabet.indexOf(raw[6]) < 2)
                this.cleared = Array.from(raw.slice(2)).reduce((bits, character, index) => bits | alphabet.indexOf(character) << (index * 6), 0);
            else throw new Error("未対応の教習記録です");
        } catch (error) { console.warn("教習記録を読み込めませんでした", error); }
    }
    static isCleared(index: number): boolean { return Number.isInteger(index) && index >= 0 && index < lessonCount && !!(this.cleared & (1 << index)); }
    static isUnlocked(index: number): boolean { return Number.isInteger(index) && index >= 0 && index < lessonCount && (tutorialUnits.some((unit) => unit.offset === index) || this.isCleared(index) || this.isCleared(index - 1)); }
    static complete(index: number): void {
        if (!Number.isInteger(index) || index < 0 || index >= lessonCount) return;
        this.cleared |= 1 << index;
        if (globalValues.nosave) return;
        try { localStorage.setItem(this.storageKey, "4:" + Array.from({ length: Math.ceil(lessonCount / 6) }, (_, i) => alphabet[this.cleared >>> (i * 6) & 63]).join("")); }
        catch (error) {
            console.warn("教習記録を保存できませんでした。今回の起動中は保持します。", error);
            PageNotice.notify("養成所のクリア記録を保存できませんでした。 今回の起動中は保持しますが、 再読み込みすると失われます。 保存領域の空きやブラウザーの設定を確認してください。");
        }
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
