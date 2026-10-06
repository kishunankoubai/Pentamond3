import { penalty } from "../Settings";
import { TrickInfo } from "../Trick";

/** 本編と教材で同じ、成立前のチェイン数を基準とする報酬。 */
export function survivalTrickReward(trick: TrickInfo, chain: number, handy = 1) {
    return {
        score: chain * 100 + (trick.time + trick.attack) * 50,
        recovery: Math.round(trick.time * handy),
        attack: Math.round((trick.attack + Math.ceil(chain / 5)) * handy),
    };
}

export function emptyRemovalPenalty(previousTask: number) {
    return { charge: previousTask, nextTask: penalty.removeLine };
}
