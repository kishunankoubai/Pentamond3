import { TimeAttackMode } from "./TimeAttackMode";
import { GamePlayer } from "../GamePlayer";
import { SimulationClock } from "../../Utilities/Loop/SimulationClock";
import { TrickInfo } from "../Tricks";
import { scoreAfterClearing, scoreAttackReward } from "../ScoreChallengeRules";

/** すべての役で目標スコアを目指すタイムアタック。 */
export class Mode3 extends TimeAttackMode {
    constructor(players: GamePlayer[], clock: SimulationClock) {
        super(players, clock);
        this.initializePlayers();
    }

    protected configurePlayer(player: GamePlayer): void {
        player.label.s$visible = { gameTime: false, playTime: true, line: false, lastTrick: true, chain: true, score: true };
    }

    protected removalScore(trick: TrickInfo, chain: number): number {
        return scoreAttackReward(trick, chain).score;
    }

    protected updateGoal(player: GamePlayer): void {
        const { score, chain, targetScore } = player.playInfo;
        const projectedScore = scoreAfterClearing(player.operator.g$settledBlockProperties, score, chain);
        this.setGoalState(player, score >= targetScore, projectedScore >= targetScore);
    }
}
