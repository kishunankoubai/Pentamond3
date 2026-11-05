import { defaultTargetScore } from "../Game/ScoreChallengeRules";
import type { DisposableGame } from "../GameProcessing/DisposableGame";
import type { PlayStatisticData } from "../Storage/PlayStatistics";
import { globalValues } from "../Config/UserSettings";
import { isStandardSurvivalRecord } from "../Game/SurvivalRules";
import { UInt32Codec } from "../Utilities/Data/UInt32Codec";
import { PageNotice } from "../Utilities/Feedback/PageNotice";
import { achievements, achievementCounterCount, achievementTricks, survivalCountIndex, sprintCountIndex, scoreChallengeCountIndex, type AchievementGrade } from "./Definitions";

/** 実績65件は3つの32bitビット列、累計11項目は可変長整数で保存する。 */
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
            return { achieved, total: items.length, percentage: items.length ? (achieved / items.length) * 100 : 0 };
        };
        return { ...count(), grades: { gold: count("gold"), silver: count("silver"), bronze: count("bronze") } };
    }

    static get g$allAchieved(): boolean {
        return achievements.every(({ id }) => this.isAchieved(id));
    }

    static achievedIds(): string[] {
        return achievements.filter(({ id }) => this.isAchieved(id)).map(({ id }) => id);
    }

    static getProgress(id: string): { current: number; target: number; unit: string } | null {
        const achievement = achievements.find((item) => item.id === id);
        if (achievement?.counter !== undefined && achievement.target !== undefined) return { current: this.counters[achievement.counter], target: achievement.target, unit: "回" };
        if (id === "tricks-all") return { current: this.counters.slice(0, achievementTricks.length).filter((count) => count > 0).length, target: achievementTricks.length, unit: "種類" };
        return null;
    }

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
            if (!raw.startsWith("1:") && !raw.startsWith("2:") && !raw.startsWith("3:")) throw new Error("未対応の実績データです");
            // v1・v2は実績64件までの2ワード。v3は65件へ拡張し、カウンターの開始位置が変わる。
            const storedFlagCount = raw.startsWith("3:") ? this.flagCount : 2;
            const values = UInt32Codec.decode(raw.slice(2), storedFlagCount + achievementCounterCount);
            this.flags = Array.from({ length: this.flagCount }, (_, i) => i < storedFlagCount ? (values[i] ?? 0) : 0);
            const lastBits = achievements.length % 32;
            if (lastBits && this.flags.at(-1)! >= 2 ** lastBits) throw new Error("実績のビット数が不正です");
            this.counters = Array.from({ length: achievementCounterCount }, (_, i) => values[storedFlagCount + i] ?? 0);
            if (raw.startsWith("1:")) {
                // 旧形式の三万点のクリア実績を現在の目標へ持ち越さない。プレイ回数と他モードの実績は維持する。
                achievements.forEach(({ category, counter }, index) => {
                    if (category === "scoreChallenge" && counter === undefined)
                        this.flags[Math.floor(index / 32)] = (this.flags[Math.floor(index / 32)] & ~(1 << (index % 32))) >>> 0;
                });
            }
            if (raw.startsWith("2:")) {
                // 旧秒数から確実に達成できる新条件も反映する。既存の実績スロットは同順で条件を緩和している。
                const firstTimeIndex = achievements.findIndex(({ id }) => id.startsWith("score-challenge-time-"));
                const previousTargets = [900, 600, 360, 240, 150].filter((_, offset) => {
                    const index = firstTimeIndex + offset;
                    return !!(this.flags[Math.floor(index / 32)] & (1 << (index % 32)));
                });
                if (previousTargets.length) this.evaluateScoreChallengeTime(Math.min(...previousTargets) * 1000);
            }
            this.evaluateCounters();
            return true;
        } catch (error) {
            this.flags.fill(0);
            this.counters.fill(0);
            console.warn("実績を読み込めませんでした", error);
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
            if (times.length) this.evaluateSprintTime(Math.min(...times));
            const scoreTimes = [data.soloScoreChallengeTime, data.multiScoreChallengeTime].filter((time) => time > 0);
            if (scoreTimes.length) this.counters[scoreChallengeCountIndex] = Math.max(this.counters[scoreChallengeCountIndex], 1);
            if (scoreTimes.length) this.evaluateScoreChallengeTime(Math.min(...scoreTimes));
            this.evaluateCounters();
        });
    }

    static reflectTutorial(units: readonly { id: string; cleared: boolean }[]): void {
        this.change(() => {
            units.forEach(({ id, cleared }) => {
                if (cleared) this.unlock(`tutorial-${id}`);
            });
            if (units.length && units.every(({ cleared }) => cleared)) this.unlock("tutorial-all");
        });
    }

    static recordReplaySaved(): void {
        this.change(() => this.unlock("replay-saved"));
    }

    static recordCompletedGame(game: DisposableGame): void {
        if (!game.g$hasStarted || !game.g$hasFinished || game.isReplay() || this.recordedGames.has(game)) return;
        this.recordedGames.add(game);
        this.change(() => {
            const mode = game.playSetting.mode;
            const countIndex = mode === 1 ? survivalCountIndex : mode === 2 ? sprintCountIndex : scoreChallengeCountIndex;
            this.counters[countIndex] = Math.min(UInt32Codec.max, this.counters[countIndex] + 1);
            game.players.forEach((player) => {
                const info = player.playInfo;
                player.trickCounts.forEach((count, i) => (this.counters[i] = Math.min(UInt32Codec.max, this.counters[i] + count)));
                if (mode === 1) {
                    const standard = isStandardSurvivalRecord(info);
                    this.evaluateSurvival(info.score, info.playTime, standard);
                    if (standard && player.trickCounts.every((count) => count > 0)) this.unlock("survival-tricks-all");
                } else if (mode === 2 && game.playSetting.targetLines === 15 && info.line >= 15) {
                    this.evaluateSprintTime(info.playTime);
                    if (info.hold === 0 && info.remove === 15) this.unlock("sprint-no-hold");
                    if (info.put === 51) this.unlock("sprint-51-puts");
                } else if (mode === 3 && game.playSetting.targetScore === defaultTargetScore && info.score >= defaultTargetScore) {
                    this.evaluateScoreChallengeTime(info.playTime);
                    if (info.hold === 0) this.unlock("score-challenge-no-hold");
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

    private static evaluateSurvival(score: number, time: number, standard: boolean): void {
        if (!standard) return;
        achievements.forEach(({ id, target }) => {
            if (target === undefined) return;
            if (id.startsWith("survival-score-") && score >= target) this.unlock(id);
            if (id.startsWith("survival-time-") && time >= target) this.unlock(id);
        });
    }

    private static evaluateSprintTime(time: number): void {
        if (!Number.isFinite(time) || time <= 0) return;
        achievements.forEach(({ id, target }) => {
            if (id.startsWith("sprint-time-") && target !== undefined && time <= target) this.unlock(id);
        });
    }

    private static evaluateScoreChallengeTime(time: number): void {
        if (!Number.isFinite(time) || time <= 0) return;
        achievements.forEach(({ id, target }) => {
            if (id.startsWith("score-challenge-time-") && target !== undefined && time <= target) this.unlock(id);
        });
    }

    private static change(action: () => void): void {
        const before = this.values().join(",");
        action();
        if (before === this.values().join(",") || globalValues.nosave) return;
        const values = this.values();
        while (values.at(-1) === 0) values.pop();
        try {
            localStorage.setItem(this.storageKey, "3:" + UInt32Codec.encode(values));
        } catch (error) {
            console.warn("実績を保存できませんでした\n再読み込みすると失われます。", error);
            PageNotice.notify("実績を保存できませんでした。 再読み込みすると失われますので保存領域の空きやブラウザーの設定を確認してください。");
        }
    }

    private static values(): number[] {
        return [...this.flags, ...this.counters];
    }

    static reset(): void {
        // 空の現行形式を残し、明示的な削除後に旧リプレイから実績を復元しない。
        localStorage.setItem(this.storageKey, "3:");
        this.flags.fill(0);
        this.counters.fill(0);
    }

    static getDataSize(): number {
        try {
            return new Blob([localStorage.getItem(this.storageKey) ?? ""]).size;
        } catch {
            return 0;
        }
    }
}
