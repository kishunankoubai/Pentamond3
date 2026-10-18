import { defaultMaxGameTime, maxGameTimeScoreInterval, minimumMaxGameTime, penalty } from "../Settings";
import { TrickInfo } from "../Trick";

/** 比較条件を揃える記録・実績は、該当プレイヤー自身の設定で判定する。 */
export function isStandardSurvivalRecord(info: { initialMaxGameTime: number; handy: number }): boolean {
    return info.initialMaxGameTime === defaultMaxGameTime && info.handy === 1;
}

/** 初期設定を基準に計算する。一度下がった上限は戻さない。 */
export function survivalMaximumTime(initial: number, current: number, averageScore: number): number {
    if (initial === Infinity) return Infinity;
    const decrease = Math.floor(Math.max(0, averageScore) / maxGameTimeScoreInterval);
    return Math.min(current, Math.max(minimumMaxGameTime, initial - decrease));
}

/** 相殺後の攻撃を、生存している送信先へ同量ずつ分配する。 */
export function sharedSurvivalDamage(attack: number, recipientCount: number): number {
    return recipientCount > 0 ? Math.ceil(attack / recipientCount) : 0;
}

/** 本編と教材で同じ、成立前のチェイン数を基準とする報酬。 */
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
