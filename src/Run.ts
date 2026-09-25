import { qs, qsAddEvent, qsAll, sleep } from "./Utils";
import { inputManager } from "./Interaction/InputManager";
import { Replay } from "./Replay/Replay";
import { GraphicSetting } from "./GraphicSetting";
import { ControllerRegisterer } from "./BeforePlaying/ControllerRegisterer";
import { DeleteDataHandler } from "./DeleteDataHandler";
import { GameStartEventSetter } from "./GameProcessing/GameStarter";
import { PlaySettingSetter } from "./BeforePlaying/PlaySettingSetter";
import { ResultPageHandler } from "./ResultPageHandler";
import { sceneManager } from "./Utilities/SceneManager";
import { globalValues } from "./Global";
import { SceneTitle } from "./Scenes/SceneTitle";
import { DataManager } from "./DataManager";

//不正なページ遷移の防止
setupInputBehavior();
function setupInputBehavior() {
    document.addEventListener("keydown", (e) => {
        if (["Tab", "Space", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
            e.preventDefault();
        }
    });

    qsAll("button").forEach((button) => {
        button.tabIndex = -1;
    });

    qsAll("input").forEach((button) => {
        button.tabIndex = -1;
    });

    qsAll("div[data-xy]").forEach((button) => {
        button.tabIndex = 0;
    });
}

//起動時処理
document.addEventListener("DOMContentLoaded", async () => {
    // pageManager.init();
    // elementManager.init();
    // inputManager.s$maxInputNumber = 1;

    console.log(`The sum of size of replayData is ${Replay.getDataSize()}byte`);
    const searchParams = new URLSearchParams(new URL(window.location.href).search);
    if (searchParams.get("nosave")) globalValues.nosave = true;

    DataManager.read();
    await sceneManager.change(SceneTitle);
});

export const debug = false;

// localStorage.removeItem("Pentamond3-replayData");

// let count = 0;
// const loop = new LoopManager();
// const loop2 = new LoopManager();
// loop.s$loopFrequency = 1000;
// loop.addEvent(["loop"], () => {
//     console.log(count);
//     count = 0;
// });
// loop2.addEvent(["loop"], () => {
//     count++;
// });
// loop.start();
// loop2.start();

// let a = performance.now();
// const A = (currentTime: number) => {
//     console.log((1000 / (currentTime - a)).toFixed(0));
//     a = currentTime;
//     requestAnimationFrame(A);
// };
// requestAnimationFrame(A);
