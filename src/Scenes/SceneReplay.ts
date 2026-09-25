import { setupPlayBackground } from "../PlayBackground";
import { ElementEventSetter } from "../Utilities/Element/ElementEventSetter";
import { ElementManager } from "../Utilities/Element/ElementManager";
import { inputManager } from "../Utilities/Interaction/InputManager";
import { InputInfo } from "../Utilities/Interaction/InputObserver";
import { PageInteraction } from "../Utilities/Interaction/PageInteraction";
import { PageInteractionSetter } from "../Utilities/Interaction/PageInteractionSetter";
import { MusicManager } from "../Utilities/Music/MusicManager";
import { Scene, sceneManager } from "../Utilities/SceneManager";
import { DynamicTextSetter } from "../Utilities/Text/DynamicTextSetter";
import { TalkManager } from "../Utilities/Text/TalkManager";

export class SceneReplay extends Scene {
    private elementManager: ElementManager;
    private pageInteraction: PageInteraction;
    private talkManager: TalkManager;
    private controller = new AbortController();

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
        setupPlayBackground();
        this.setPageAnimation();
        this.setupPausePage();
        this.setupResultPage();
        this.pageInteraction.start();
    }

    protected close(): void {
        // this.game?.loop?.stop();
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

        const resultPage = this.pageManager.getPage("result")!;
        resultPage.setOpenAnimation(
            [
                {
                    opacity: "0",
                },
                {
                    opacity: "1",
                },
            ],
            {
                duration: 500,
                direction: "normal",
                iterations: 1,
                easing: "ease-in",
            }
        );
    }

    setupPausePage() {
        this.pageManager.addHandler("changePage-play", () => {
            inputManager.addHandler("inputValid", ([_, info]: [any, InputInfo]) => {
                const pauseInputName = ["KeyP", "Escape", "button:9"];
                // if (pauseInputName.includes(info.name) && this.game && !this.game.loop.g$isStopping && this.game.g$operable) {
                //     this.game.loop.stop();
                //     this.pageManager.openPage("pause");
                // }
            });
        });

        //画面を閉じたりした場合、自動でポーズにする
        document.addEventListener(
            "visibilitychange",
            () => {
                // if (document.hidden && this.game && !this.game.g$hasFinished && !this.game.loop.g$isStopping && this.game.g$operable) {
                //     this.game.loop.stop();
                //     this.pageManager.openPage("pause");
                // }
            },
            { signal: this.controller.signal }
        );

        const container = document.querySelector<HTMLElement>("#pause .container")!;
        container.querySelector(":nth-child(1)")?.addEventListener("click", () => {
            // if (this.game) this.game.loop.start();
            this.pageManager.backPage(1);
            MusicManager.fadeAllBGM(1, 200);
        });
        container.querySelector(":nth-child(2)")?.addEventListener("click", async () => {
            await MusicManager.fadeOutBGM(100);
            await this.pageManager.backPageImmediately(2);
            sceneManager.change(SceneReplay);
        });
        container.querySelector(":nth-child(3)")?.addEventListener("click", async () => {
            await MusicManager.fadeOutBGM(100);
            this.pageManager.backPage(2);
        });

        this.pageManager.addHandler("openPage-pause", () => {
            MusicManager.fadeAllBGM(0.5, 200);
        });
    }

    setupResultPage() {
        const container = document.querySelector<HTMLElement>("#result .container")!;
        container.querySelector(":nth-child(1)")?.addEventListener("click", async () => {
            await MusicManager.fadeOutBGM(100);
            const resultPage = this.pageManager.getPage("result")!;
            resultPage.setCloseAnimation(
                [
                    {},
                    {
                        clipPath: "circle(100% at 50% 50%)",
                        backgroundColor: "#888877",
                        color: "#888877",
                    },
                    {
                        filter: "blur(1vh)",
                    },
                    {
                        backgroundColor: "#888877",
                        color: "#888877",
                        clipPath: "circle(0% at 50% 50%)",
                        filter: "blur(1vh)",
                    },
                ],
                {
                    duration: 1000,
                    direction: "normal",
                    iterations: 1,
                    easing: "ease-in-out",
                }
            );
            this.pageManager.getPage("play")!.s$visible = false;
            resultPage.s$visible = false;
            await resultPage.hasClosed();
            this.pageManager.backPage(2);
        });
        container.querySelector(":nth-child(2)")?.addEventListener("click", async () => {
            await MusicManager.fadeOutBGM(100);
            await this.pageManager.backPageImmediately(2);
            sceneManager.change(SceneReplay);
        });
    }

    async setupGame() {}
}
