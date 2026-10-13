import { defaultMaxGameTime, penalty } from "../Settings";
import { TrickInfo } from "../Trick";

/** 比較条件を揃える記録・実績は、該当プレイヤー自身の設定で判定する。 */
export function isStandardSurvivalRecord(info: { maxGameTime: number; handy: number }): boolean {
    return info.maxGameTime === defaultMaxGameTime && info.handy === 1;
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
        attack: Math.round((trick.attack + Math.ceil(chain / 5)) * handy),
    };
}

export function emptyRemovalPenalty(previousTask: number) {
    return { charge: previousTask, nextTask: penalty.removeLine };
}
