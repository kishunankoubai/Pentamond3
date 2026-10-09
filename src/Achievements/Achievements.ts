import type { DisposableGame } from "../GameProcessing/DisposableGame";
import type { PlayStatisticData } from "../PlayStatistics";
import { globalValues } from "../Global";
import { defaultMaxGameTime } from "../Settings";
import { UInt32Codec } from "../Utilities/Data/UInt32Codec";
import { PageNotice } from "../Utilities/Feedback/PageNotice";
import { achievements, achievementCounterCount, achievementTricks, survivalCountIndex, sprintCountIndex, type AchievementGrade } from "./Definitions";

/** 実績55件は2つの32bitビット列、累計10項目は可変長整数で保存する。 */
export class Achievements {
    static readonly storageKey = "Pentamond3-achievements";
    private static readonly flagCount = Math.ceil(achievements.length / 32);
    private static flags = Array<number>(this.flagCount).fill(0);
    private static counters = Array<number>(achievementCounterCount).fill(0);
    private static recordedGames = new WeakSet<DisposableGame>();

    static isAchieved(id: string): boolean {
        const index = achievements.findIndex((achievement) => achievement.id === id);
        return index >= 0 && !!(this.flags[Math.floor(index / 32)] & (1 << (index % 32)));
    }

    static getSummary() {
        const count = (grade?: AchievementGrade) => {
            const items = achievements.filter((achievement) => !grade || achievement.grade === grade);
            const achieved = items.filter((achievement) => this.isAchieved(achievement.id)).length;
            return { achieved, total: items.length, percentage: items.length ? achieved / items.length * 100 : 0 };
        };
        return { ...count(), grades: { gold: count("gold"), silver: count("silver"), bronze: count("bronze") } };
    }

    static get allAchieved(): boolean { return achievements.every(({ id }) => this.isAchieved(id)); }

    private static unlock(id: string): void {
        const index = achievements.findIndex((achievement) => achievement.id === id);
        if (index < 0) throw new Error(`実績が存在しません: ${id}`);
        const flag = Math.floor(index / 32);
        this.flags[flag] = (this.flags[flag] | (1 << (index % 32))) >>> 0;
    }

    static read(): boolean {
        this.flags.fill(0);
        this.counters.fill(0);
        if (globalValues.nosave) return false;
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return false;
            if (!raw.startsWith("1:")) throw new Error("未対応の実績データです");
            const values = UInt32Codec.decode(raw.slice(2), this.flagCount + achievementCounterCount);
            this.flags = Array.from({ length: this.flagCount }, (_, i) => values[i] ?? 0);
            const lastBits = achievements.length % 32;
            if (lastBits && this.flags.at(-1)! >= 2 ** lastBits) throw new Error("実績のビット数が不正です");
            this.counters = Array.from({ length: achievementCounterCount }, (_, i) => values[this.flagCount + i] ?? 0);
            this.evaluateCounters();
            return true;
        } catch (error) {
            this.flags.fill(0);
            this.counters.fill(0);
            console.warn("実績を読み込めませんでした。 初期値で続行します。", error);
            return false;
        }
    }

    /** 旧記録から確実に判定できる項目だけを反映。役別・モード別の不明な回数は推測しない。 */
    static reflectStatistics(data: Readonly<PlayStatisticData>): void {
        this.change(() => {
            this.counters[0] = Math.max(this.counters[0], data.lineCount);
            if (data.soloSurvivalTime || data.soloSurvivalScore || data.multiSurvivalScore || data.soloRecovery || data.multiSurvivalAttack)
                this.counters[survivalCountIndex] = Math.max(this.counters[survivalCountIndex], 1);
            const times = [data.soloSprintTime, data.multiSprintTime].filter((time) => time > 0);
            if (times.length) this.counters[sprintCountIndex] = Math.max(this.counters[sprintCountIndex], 1);
            this.evaluateSurvival(Math.max(data.soloSurvivalScore, data.multiSurvivalScore), data.soloSurvivalTime, true);
            if (times.length) this.evaluateSprintTime(Math.min(...times));
            this.evaluateCounters();
        });
    }

    static reflectTutorial(units: readonly { id: string; cleared: boolean }[]): void {
        this.change(() => {
            units.forEach(({ id, cleared }) => { if (cleared) this.unlock(`tutorial-${id}`); });
            if (units.length && units.every(({ cleared }) => cleared)) this.unlock("tutorial-all");
        });
    }

    static recordReplaySaved(): void { this.change(() => this.unlock("replay-saved")); }

    static recordCompletedGame(game: DisposableGame): void {
        if (!game.g$hasStarted || !game.g$hasFinished || game.isReplay() || this.recordedGames.has(game)) return;
        this.recordedGames.add(game);
        this.change(() => {
            const mode = game.playSetting.mode;
            const countIndex = mode === 1 ? survivalCountIndex : sprintCountIndex;
            this.counters[countIndex] = Math.min(UInt32Codec.max, this.counters[countIndex] + 1);
            game.players.forEach((player) => {
                const info = player.playInfo;
                player.trickCounts.forEach((count, i) => this.counters[i] = Math.min(UInt32Codec.max, this.counters[i] + count));
                if (mode === 1) {
                    this.evaluateSurvival(info.score, info.playTime, game.playSetting.maxGameTime === defaultMaxGameTime);
                    // 他プレイヤーとの合算ではなく、同じプレイヤーが全種類を揃える。
                    if (player.trickCounts.every((count) => count > 0)) this.unlock("survival-tricks-all");
                } else if (mode === 2 && game.playSetting.targetLines === 15 && info.line >= 15) {
                    this.evaluateSprintTime(info.playTime);
                    if (info.hold === 0 && info.remove === 15) this.unlock("sprint-no-hold");
                    if (info.put === 51) this.unlock("sprint-51-puts");
                }
            });
            this.evaluateCounters();
        });
    }

    private static evaluateCounters(): void {
        achievements.forEach(({ id, counter, target }) => {
            if (counter !== undefined && target !== undefined && this.counters[counter] >= target) this.unlock(id);
        });
        if (this.counters.slice(0, achievementTricks.length).every((count) => count > 0)) this.unlock("tricks-all");
    }

    private static evaluateSurvival(score: number, time: number, defaultTime: boolean): void {
        achievements.forEach(({ id, target }) => {
            if (target === undefined) return;
            if (id.startsWith("survival-score-") && score >= target) this.unlock(id);
            if (id.startsWith("survival-time-") && defaultTime && time >= target) this.unlock(id);
        });
    }

    private static evaluateSprintTime(time: number): void {
        if (!Number.isFinite(time) || time <= 0) return;
        achievements.forEach(({ id, target }) => { if (id.startsWith("sprint-time-") && target !== undefined && time <= target) this.unlock(id); });
    }

    private static change(action: () => void): void {
        const before = this.values().join(",");
        action();
        if (before === this.values().join(",") || globalValues.nosave) return;
        const values = this.values();
        while (values.at(-1) === 0) values.pop();
        try { localStorage.setItem(this.storageKey, "1:" + UInt32Codec.encode(values)); }
        catch (error) {
            console.warn("実績を保存できませんでした。 今回の起動中は保持します。", error);
            PageNotice.notify("実績を保存できませんでした。 今回の起動中は保持しますが、 再読み込みすると失われます。 保存領域の空きやブラウザーの設定を確認してください。");
        }
    }

    private static values(): number[] { return [...this.flags, ...this.counters]; }

    static reset(): void {
        // 空の現行形式を残し、明示的な削除後に旧リプレイから実績を復元しない。
        localStorage.setItem(this.storageKey, "1:");
        this.flags.fill(0);
        this.counters.fill(0);
    }

    static getDataSize(): number {
        try { return new Blob([localStorage.getItem(this.storageKey) ?? ""]).size; }
        catch { return 0; }
    }
}
