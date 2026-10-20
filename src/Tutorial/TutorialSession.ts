import { Tutorial1Board } from "./Tutorial1/Board";
import { Tutorial2Board } from "./Tutorial2/Board";
import { Tutorial3Board } from "./Tutorial3/Board";
import { Tutorial4Board } from "./Tutorial4/Board";
import { getTutorialUnit } from "./TutorialUnits";
import type { PracticeOutcome } from "./TutorialTypes";

/** 教材の生成・稼働・片付け。Sceneは教材ごとのリソース管理を持たない。 */
export class TutorialSession {
    readonly unit;
    readonly board: Tutorial1Board | Tutorial2Board | Tutorial3Board | Tutorial4Board;
    constructor(index: number) {
        this.unit = getTutorialUnit(index);
        switch (this.unit.id) {
            case "operation":
                this.board = new Tutorial1Board(index);
                break;
            case "basic":
                this.board = new Tutorial2Board(index);
                break;
            case "advanced":
                this.board = new Tutorial3Board(index);
                break;
            case "trick":
                this.board = new Tutorial4Board(index);
                break;
        }
    }
    setActive(active: boolean): void {
        if (this.board instanceof Tutorial2Board) this.board.setActive(active);
    }
    tick(elapsed: number): PracticeOutcome {
        return this.board instanceof Tutorial2Board ? this.board.tick(elapsed) : {};
    }
    dispose(): void {
        if ("dispose" in this.board) this.board.dispose();
    }
}
