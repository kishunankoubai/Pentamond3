import { ControllerRegisterer } from "../BeforePlaying/ControllerRegisterer";
import { GameProcessing } from "../GameProcessing/GameProcessing";
import { setupPlayBackground } from "../PlayBackground";
import { ElementEventSetter } from "../Utilities/Element/ElementEventSetter";
import { ElementManager } from "../Utilities/Element/ElementManager";
import { inputManager } from "../Utilities/Interaction/InputManager";
import { InputInfo, InputObserver } from "../Utilities/Interaction/InputObserver";
import { PageInteraction } from "../Utilities/Interaction/PageInteraction";
import { PageInteractionSetter } from "../Utilities/Interaction/PageInteractionSetter";
import { MusicManager } from "../Utilities/Music/MusicManager";
import { Scene } from "../Utilities/SceneManager";
import { MyEvent } from "../Utilities/MyEventListener";
import { PageManager } from "../Utilities/Page/PageManager";
import { DynamicTextSetter } from "../Utilities/Text/DynamicTextSetter";
import { TalkManager } from "../Utilities/Text/TalkManager";

export class ScenePlay extends Scene {
    private elementManager: ElementManager;
    private pageInteraction: PageInteraction;
    private talkManager: TalkManager;
    private controller = new AbortController();
    private pauseInputEvent: MyEvent | null = null;

    constructor() {
        super("src/HTML/ScenePlay.html");
        this.elementManager = new ElementManager(this);
        this.pageInteraction = new PageInteraction(this);
        this.talkManager = new TalkManager(this);
        this.sceneSetters.push(
            new ElementEventSetter(this.elementManager),
            new PageInteractionSetter(this.pageInteraction),
            new DynamicTextSetter(this.talkManager)
            //
        );
    }

    protected initialize(): void {
        this.setPageAnimation();
        this.setupPausePage();
        this.pageInteraction.start();
        setupPlayBackground();
    }

    protected close(): void {
        if (this.pauseInputEvent) inputManager.removeEvent(this.pauseInputEvent);
        this.pageInteraction.stop();
        this.controller.abort();
    }

    async defaultStart() {
        await this.setupGame();
        this.pageManager.openPage("play");
        // if (globalValues.stageNumber <= 2) MusicManager.get("Vector Space")?.play();
        // else MusicManager.get("Unreachability")?.play();
    }

    private setPageAnimation() {
        this.pageManager.g$pages.forEach((page) => {
            page.setOpenAnimation(
                [
                    {
                        transform: "translate(0, 0.3vh)",
                        opacity: 0,
                    },
                    {
                        transform: "",
                        opacity: 1,
                    },
                ],
                {
                    duration: 200,
                    direction: "normal",
                    iterations: 1,
                    easing: "ease-in",
                }
            );
            page.setCloseAnimation(
                [
                    {
                        transform: "",
                        opacity: 1,
                    },
                    {
                        transform: "translate(0, 0.3vh)",
                        opacity: 0,
                    },
                ],
                {
                    duration: 200,
                    direction: "normal",
                    iterations: 1,
                    easing: "ease-in",
                }
            );
        });
    }

    protected setupPausePage() {
        this.pauseInputEvent = inputManager.addHandler("inputValid", ([input, info]: [InputObserver, InputInfo]) => {
            const playerIndex = inputManager.g$registeredInputs.indexOf(input);
            if (playerIndex < 0) return;
            const pauseInputs = ["KeyP", "Escape", ...(ControllerRegisterer.gamepadConfigs[playerIndex]?.pause || [])];
            if (pauseInputs.includes(info.name)) this.pauseGame();
        });

        //画面を閉じたりした場合、自動でポーズにする
        document.addEventListener(
            "visibilitychange",
            () => {
                if (document.hidden) this.pauseGame();
            },
            { signal: this.controller.signal }
        );

        document.getElementById("resumeButton")?.addEventListener("click", async () => {
            await this.pageManager.backPage(1);
            GameProcessing.resume();
            await MusicManager.fadeAllBGM(1, 200);
        });
        document.getElementById("pauseRestartButton")?.addEventListener("click", async () => {
            await this.pageManager.backPageImmediately(1);
            await this.restartGame();
        });
        document.getElementById("playPrepareButton")?.addEventListener("click", () => this.returnTo("playPrepare"));
        document.getElementById("modeSelectButton")?.addEventListener("click", () => {
            const target = GameProcessing.currentGame?.playSetting.playerNumber === 1 ? "soloStageSelect" : "multiStageSelect";
            this.returnTo(target);
        });
        document.getElementById("titleButton")?.addEventListener("click", () => this.returnTo("title"));

        this.pageManager.addHandler("openPage-pause", () => {
            MusicManager.fadeAllBGM(0.5, 200);
        });
    }

    protected pauseGame(): void {
        const game = GameProcessing.currentGame;
        if (!game || game.g$hasFinished || !game.g$isPlaying || this.pageManager.g$currentPageId !== "play") return;
        GameProcessing.pause();
        this.pageManager.openPage("pause");
    }

    protected async returnTo(pageId: string): Promise<void> {
        const back = PageManager.getBackIndex(pageId);
        if (back <= 0) {
            console.warn(`戻り先のページが履歴にありません: ${pageId}`);
            return;
        }
        GameProcessing.quit();
        await MusicManager.fadeOutBGM(150);
        await this.pageManager.backPageImmediately(back);
        await MusicManager.playExclusiveBGM("つみきのおしろ");
    }

    protected restartGame(): Promise<void> {
        return GameProcessing.restartNormal();
    }

    async setupGame() {}
}
