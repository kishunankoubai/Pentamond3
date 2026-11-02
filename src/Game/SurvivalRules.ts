import { defaultMaxGameTime, maxGameTimeScoreInterval, minimumMaxGameTime, penalty } from "../Config/GameConfig";
import { TrickInfo } from "./Tricks";

/**
 * デフォルトの持ち時間、ハンデかどうか
 **/
export function isStandardSurvivalRecord(info: { initialMaxGameTime: number; handy: number }): boolean {
    return info.initialMaxGameTime === defaultMaxGameTime && info.handy === 1;
}

/** 初期設定を基準に計算する持ち時間の上限 */
export function survivalMaximumTime(initial: number, current: number, averageScore: number): number {
    if (initial === Infinity) return Infinity;
    const decrease = Math.floor(Math.max(0, averageScore) / maxGameTimeScoreInterval);
    return Math.min(current, Math.max(minimumMaxGameTime, initial - decrease));
}

/** 相殺後の攻撃を生存している送信先へ同量ずつ分配する */
export function sharedSurvivalDamage(attack: number, recipientCount: number): number {
    return recipientCount > 0 ? Math.ceil(attack / recipientCount) : 0;
}

/** 成立前のチェイン数を基準とする報酬 */
export function survivalTrickReward(trick: TrickInfo, chain: number, handy = 1) {
    return {
        score: chain * (chain + 1) * 50 + (trick.time + trick.attack) * 50,
        recovery: Math.round(trick.time * handy),
        attack: Math.round((trick.attack + Math.ceil(chain / 4)) * handy),
    };
}

export function emptyRemovalPenalty(previousTask: number) {
    return { charge: previousTask, nextTask: penalty.removeLine };
}
