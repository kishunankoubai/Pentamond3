import { GameProcessing } from "../GameProcessing/GameProcessing";
import { ScenePlay } from "./ScenePlay";

export class SceneReplay extends ScenePlay {
    protected override restartGame(): Promise<void> {
        return GameProcessing.restartReplay();
    }
}
