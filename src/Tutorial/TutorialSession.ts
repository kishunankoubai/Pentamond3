import { PracticeBoard } from "./PracticeBoard";
import { BasicRuleBoard } from "./BasicRuleBoard";
import { AdvancedBoard } from "./AdvancedBoard";
import { TrickPracticeBoard } from "./TrickPracticeBoard";
import { getTutorialUnit } from "./TutorialUnits";
import type { PracticeOutcome } from "./TutorialTypes";

/** 教材の生成・稼働・片付け。Sceneは教材ごとのリソース管理を持たない。 */
export class TutorialSession {
    readonly unit;
    readonly board: PracticeBoard | BasicRuleBoard | AdvancedBoard | TrickPracticeBoard;
    constructor(index: number) {
        this.unit = getTutorialUnit(index);
        switch (this.unit.id) {
            case "operation": this.board = new PracticeBoard(index); break;
            case "basic": this.board = new BasicRuleBoard(index); break;
            case "advanced": this.board = new AdvancedBoard(index); break;
            case "trick": this.board = new TrickPracticeBoard(index); break;
        }
    }
    setActive(active: boolean): void {
        if (this.board instanceof BasicRuleBoard) this.board.setActive(active);
    }
    tick(elapsed: number): PracticeOutcome {
        return this.board instanceof BasicRuleBoard ? this.board.tick(elapsed) : {};
    }
    dispose(): void {
        if ("dispose" in this.board) this.board.dispose();
    }
}
