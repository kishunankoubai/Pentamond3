import type { PlayStatisticData, PlayStatisticKey } from "../Storage/PlayStatistics";

/** 集計前後の差だけを見るので、従来と同じ比較条件・保存形式を維持する。 */
export function newRecordHighlights(before: Readonly<PlayStatisticData>, after: Readonly<PlayStatisticData>): string[] {
    const records: [PlayStatisticKey, string, boolean][] = [
        ["soloSurvivalScore", "最高スコア更新！", false],
        ["soloSurvivalTime", "最長プレイ時間更新！", true],
        ["soloSprintTime", "最速タイム更新！", true],
        ["multiSurvivalScore", "最高スコア更新！", false],
        ["multiSurvivalAttack", "最大攻撃更新！", false],
        ["multiSprintTime", "最速タイム更新！", true],
    ];
    return records.filter(([key]) => after[key] > 0 && after[key] !== before[key]).map(([key, label, time]) => `${label} ${time ? (after[key] / 1000).toFixed(2) : after[key].toLocaleString("ja-JP")}`);
}
