import type { DisposableGame } from "./GameProcessing/DisposableGame";
import { globalValues } from "./Global";
import { UInt32Codec } from "./Utilities/Data/UInt32Codec";

// 保存順は形式v1の一部。順番を変更しない。
const fields = [
    "playCount", "putCount", "trickCount", "lineCount", "unputCount", "holdCount",
    "soloSurvivalScore", "soloSurvivalTime", "soloRecovery", "soloSprintTime",
    "multiSurvivalScore", "multiSurvivalAttack", "multiSprintTime",
] as const;
export type PlayStatisticKey = typeof fields[number];
export type PlayStatisticData = Record<PlayStatisticKey, number>;

export class PlayStatistics {
    static readonly storageKey = "Pentamond3-playStatistics";
    private static data = this.emptyData();
    private static recordedGames = new WeakSet<DisposableGame>();

    private static emptyData(): PlayStatisticData {
        return Object.fromEntries(fields.map((field) => [field, 0])) as PlayStatisticData;
    }

    static getData(): Readonly<PlayStatisticData> {
        return { ...this.data };
    }

    static read(): void {
        this.data = this.emptyData();
        if (globalValues.nosave) return;
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return;
            if (!raw.startsWith("1:")) throw new Error("未対応のプレイ統計です");
            const values = UInt32Codec.decode(raw.slice(2), fields.length);
            fields.forEach((field, i) => this.data[field] = values[i] ?? 0);
        } catch (error) {
            console.warn("プレイ統計を読み込めませんでした。初期値で続行します。", error);
        }
    }

    static reset(): void {
        // 削除に失敗した場合はメモリー上の記録も維持する。
        localStorage.removeItem(this.storageKey);
        this.data = this.emptyData();
    }

    static getDataSize(): number {
        try { return new Blob([localStorage.getItem(this.storageKey) ?? ""]).size; }
        catch { return 0; }
    }

    /** 通常プレイのゲーム終了確定時だけ、一度だけ集計する。途中退出・リプレイは除外。 */
    static recordCompletedGame(game: DisposableGame): void {
        if (!game.g$hasStarted || !game.g$hasFinished || game.isReplay() || this.recordedGames.has(game)) return;
        this.recordedGames.add(game);
        const normalize = (value: number) => Number.isFinite(value) ? Math.min(UInt32Codec.max, Math.max(0, Math.floor(value))) : 0;
        const add = (key: PlayStatisticKey, value: number) => this.data[key] = normalize(this.data[key] + normalize(value));
        const max = (key: PlayStatisticKey, value: number) => this.data[key] = Math.max(this.data[key], normalize(value));
        const minTime = (key: PlayStatisticKey, value: number) => {
            const time = normalize(value);
            if (time > 0 && (!this.data[key] || time < this.data[key])) this.data[key] = time;
        };
        const solo = game.players.length === 1;
        add("playCount", 1);
        game.players.forEach((player) => {
            const p = player.playInfo;
            // 詳細結果のputは一手戻し分が差し引かれているため、実行した設置回数へ戻す。
            add("putCount", p.put + p.unput);
            add("trickCount", p.trickCount);
            add("lineCount", p.line);
            add("unputCount", p.unput);
            add("holdCount", p.hold);
            if (game.playSetting.mode === 1) {
                if (solo) {
                    max("soloSurvivalScore", p.score);
                    max("soloSurvivalTime", p.playTime);
                    add("soloRecovery", p.recovery);
                } else {
                    max("multiSurvivalScore", p.score);
                    max("multiSurvivalAttack", player.damageInfo.maxAttack);
                }
            } else if (game.playSetting.mode === 2 && game.playSetting.targetLines === 15 && p.line >= 15) {
                minTime(solo ? "soloSprintTime" : "multiSprintTime", p.playTime);
            }
        });
        this.save();
    }

    private static save(): void {
        if (globalValues.nosave) return;
        // 末尾の未達成項目(0)を省略し、小さい整数には1バイトだけ使う。
        const values = fields.map((field) => this.data[field]);
        while (values.at(-1) === 0) values.pop();
        try { localStorage.setItem(this.storageKey, "1:" + UInt32Codec.encode(values)); }
        catch (error) { console.warn("プレイ統計を保存できませんでした。今回の起動中は記録を保持します。", error); }
    }
}
