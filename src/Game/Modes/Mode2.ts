import { TimeAttackMode } from "./TimeAttackMode";
import { GamePlayer } from "../GamePlayer";
import { SimulationClock } from "../../Utilities/Loop/SimulationClock";
import { TrickInfo } from "../Tricks";
import { boardTricks, isLineTrick } from "../BoardTricks";
import { survivalTrickReward } from "../SurvivalRules";

/** 一列揃えを目標の列数だけ成立させるタイムアタック */
export class Mode2 extends TimeAttackMode {
    constructor(players: GamePlayer[], clock: SimulationClock) {
        super(players, clock);
        this.initializePlayers();
    }

    protected configurePlayer(player: GamePlayer): void {
        player.label.s$visible = { gameTime: false, playTime: true, line: true, lastTrick: false, chain: true, score: true };
        player.canvas.guideBorder = true;
        player.canvas.guideBorderHeight = player.playInfo.targetLines;
    }

    protected removalScore(trick: TrickInfo, chain: number): number | null {
        return isLineTrick(trick) ? chain * 100 + (trick.time + trick.attack) * 50 : null;
    }

    protected updateGoal(player: GamePlayer): void {
        const { line, targetLines } = player.playInfo;
        const remainingLines = Array.from(boardTricks(player.operator.g$settledBlockProperties)).filter(isLineTrick).length;
        player.canvas.guideBorderHeight = Math.max(0, targetLines - line);
        this.setGoalState(player, line >= targetLines, line + remainingLines >= targetLines);
    }
}
