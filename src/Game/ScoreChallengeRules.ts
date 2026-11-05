import type { BlockProperty } from "../BlockOperate/Block";
import type { TrickInfo } from "./Tricks";
import { boardTricks } from "./BoardTricks";

export const defaultTargetScore = 50000;
export const minTargetScore = 10000;
export const maxTargetScore = 90000;
export const targetScoreStep = 10000;

/** 実際の消去と同じ得点計算で、設置済み地形を消し切ったときのスコアを求める。 */
export function scoreAfterClearing(properties: BlockProperty[][], score: number, chain: number): number {
    for (const trick of boardTricks(properties)) {
        if (trick) score += scoreAttackReward(trick, chain++).score;
        else chain = 0;
    }
    return score;
}

export function scoreAttackReward(trick: TrickInfo, chain: number) {
    const value = trick.time + trick.attack;
    const multiplier = value > 80 ? 3 : value > 20 ? 2 : 1;
    return {
        score: chain * 100 + value * 50 * multiplier,
    };
}
