import { PlaySettingSetter } from "../BeforePlaying/PlaySettingSetter";
import { ControllerRegisterer } from "../BeforePlaying/ControllerRegisterer";
import { ControllerSettingManager } from "../ControllerSettingManager";
import { sceneManager } from "../Utilities/SceneManager";
import { ScenePlay } from "../Scenes/ScenePlay";
import { GameProcessing } from "./GameProcessing";

/** タイトルからの開始のみ担当。再開・再戦は各Sceneが担当する。 */
export class GameStartEventSetter {
    static normal(): void {
        let starting = false;
        document.querySelectorAll<HTMLElement>(".playStart").forEach((button) => button.addEventListener("click", async () => {
            if (starting) return;
            starting = true;
            try {
                const playSetting = PlaySettingSetter.getPlaySetting();
                if (playSetting.playerNumber === 1) ControllerRegisterer.gamepadConfigs = [ControllerSettingManager.getSelectedConfig()];
                if (!await sceneManager.change(ScenePlay, false)) return;
                await GameProcessing.startNormal(playSetting);
            } finally { starting = false; }
        }));
    }
}
