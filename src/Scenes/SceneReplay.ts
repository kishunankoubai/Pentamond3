import { GameProcessing } from "../GameProcessing/GameProcessing";
import { AutoInputObserver } from "../Utilities/Interaction/AutoInputObserver";
import { inputManager } from "../Utilities/Interaction/InputManager";
import { InputInfo, InputObserver } from "../Utilities/Interaction/InputObserver";
import { MusicManager } from "../Utilities/Music/MusicManager";
import { PageManager } from "../Utilities/Page/PageManager";
import { ScenePlay } from "./ScenePlay";

export class SceneReplay extends ScenePlay {
    private controlsHideTimer?: number;
    constructor() {
        super("src/HTML/SceneReplay.html");
    }

    protected override setupPausePage(): void {
        this.pauseInputEvent = inputManager.addHandler("inputValid", ([input, info]: [InputObserver, InputInfo]) => {
            if (input instanceof AutoInputObserver || this.pageManager.g$currentPageId !== "play") return;
            this.showControls();

            if (["KeyP", "Escape", "button:8", "button:9"].includes(info.name)) {
                this.pauseGame();
                return;
            }
            if (["ArrowLeft", "KeyA", "button:14", "stick:-0"].includes(info.name)) {
                GameProcessing.changeReplaySpeed(-1);
            } else if (["ArrowRight", "KeyD", "button:15", "stick:+0"].includes(info.name)) {
                GameProcessing.changeReplaySpeed(1);
            } else if (["Enter", "Space", "KeyZ", "button:1"].includes(info.name)) {
                GameProcessing.toggleReplayPlayback();
            }
        });
        const timer = window.setInterval(() => GameProcessing.updateReplayTimeDisplay(), 100);
        this.addHandler("sceneEnd", () => {
            window.clearInterval(timer);
            window.clearTimeout(this.controlsHideTimer);
        }, 1);
        // 実際の操作だけで表示する。再生データの入力では表示しない。
        document.addEventListener("pointerdown", () => this.showControls(), { signal: this.controller.signal });
        document.addEventListener("keydown", () => this.showControls(), { signal: this.controller.signal });
        this.pageManager.addHandler("changePage", () => {
            window.clearTimeout(this.controlsHideTimer);
            document.getElementById("replayControls")?.classList.remove("visible");
        });

        document.addEventListener("visibilitychange", () => {
            if (document.hidden) this.pauseGame();
        }, { signal: this.controller.signal });
        window.addEventListener("blur", () => this.pauseGame(), { signal: this.controller.signal });

        document.getElementById("replayResumeButton")?.addEventListener("click", async () => {
            if (!await this.pageManager.backPage(1)) return;
            GameProcessing.resumeReplay();
            await MusicManager.fadeAllBGM(1, 200);
        });
        document.getElementById("replayRestartButton")?.addEventListener("click", async () => {
            if (!await this.pageManager.backPageImmediately(1)) return;
            await this.restartGame();
        });
        document.getElementById("replayListButton")?.addEventListener("click", () => this.returnToClosest(["replay", "savedReplay"]));
        document.getElementById("replayTitleButton")?.addEventListener("click", () => this.returnTo("title"));

        this.pageManager.addHandler("openPage-replayPause", () => MusicManager.fadeAllBGM(0.5, 200));
    }

    private showControls(): void {
        if (this.pageManager.g$currentPageId !== "play") return;
        const controls = document.getElementById("replayControls");
        if (!controls) return;
        window.clearTimeout(this.controlsHideTimer);
        controls.classList.add("visible");
        this.controlsHideTimer = window.setTimeout(() => controls.classList.remove("visible"), 3000);
    }

    protected override pauseGame(): void {
        const game = GameProcessing.currentGame;
        if (!game?.isReplay() || game.g$hasFinished || this.pageManager.g$currentPageId !== "play") return;
        GameProcessing.pauseReplay();
        this.pageManager.openPage("replayPause");
    }

    protected override restartGame(): Promise<void> {
        return GameProcessing.restartReplay();
    }

    private returnToClosest(pageIds: string[]): Promise<void> {
        const target = pageIds
            .map((pageId) => ({ pageId, back: PageManager.getBackIndex(pageId) }))
            .filter(({ back }) => back > 0)
            .sort((a, b) => a.back - b.back)[0];
        if (!target) {
            console.warn(`戻り先のページが履歴にありません: ${pageIds.join(", ")}`);
            return Promise.resolve();
        }
        return this.returnTo(target.pageId);
    }
}
