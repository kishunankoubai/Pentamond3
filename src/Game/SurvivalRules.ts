import { penalty } from "../Settings";
import { TrickInfo } from "../Trick";

/** 本編と教材で同じ、成立前のチェイン数を基準とする報酬。 */
export function survivalRoleReward(role: TrickInfo, chain: number, handy = 1) {
    return {
        score: chain * 100 + (role.time + role.attack) * 50,
        recovery: Math.round(role.time * handy),
        attack: Math.round((role.attack + Math.ceil(chain / 5)) * handy),
    };
}

export function emptyRemovalPenalty(previousTask: number) {
    return { charge: previousTask, nextTask: penalty.removeLine };
}
