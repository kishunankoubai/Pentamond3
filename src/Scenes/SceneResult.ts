import { globalValues } from "../Global";
import { ResultPageHandler } from "../ResultPageHandler";
import { sleep } from "../Utilities/Common";
import { ElementEventSetter } from "../Utilities/Element/ElementEventSetter";
import { ElementManager } from "../Utilities/Element/ElementManager";
import { PageInteraction } from "../Utilities/Interaction/PageInteraction";
import { PageInteractionSetter } from "../Utilities/Interaction/PageInteractionSetter";
import { LoopManager } from "../Utilities/Loop/LoopManager";
import { MusicManager } from "../Utilities/Music/MusicManager";
import { Scene } from "../Utilities/SceneManager";
import { DynamicTextSetter } from "../Utilities/Text/DynamicTextSetter";
import { TalkManager } from "../Utilities/Text/TalkManager";
import { GameProcessing } from "../GameProcessing/GameProcessing";
import { PageManager } from "../Utilities/Page/PageManager";

export class SceneResult extends Scene {
    private elementManager: ElementManager;
    private pageInteraction: PageInteraction;
    private talkManager: TalkManager;
    constructor() {
        super("src/HTML/SceneResult.html");
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
        this.pageInteraction.start();
        ResultPageHandler.setEvents();
        MusicManager.playExclusiveBGM("おかたづけ");
        document.getElementById("resultRestartButton")?.addEventListener("click", () => GameProcessing.restartNormal());
        document.getElementById("resultPlayPrepareButton")?.addEventListener("click", () => this.returnTo("playPrepare"));
        document.getElementById("resultModeSelectButton")?.addEventListener("click", () => {
            const target = GameProcessing.currentGame?.playSetting.playerNumber === 1 ? "soloStageSelect" : "multiStageSelect";
            this.returnTo(target);
        });
        document.getElementById("resultTitleButton")?.addEventListener("click", () => this.returnTo("title"));
        document.getElementById("replayRestartButton")?.addEventListener("click", () => GameProcessing.restartReplay());
        document.getElementById("replayListButton")?.addEventListener("click", () => this.returnToClosest(["replay", "savedReplay"]));
        document.getElementById("replayResultTitleButton")?.addEventListener("click", () => this.returnTo("title"));
    }

    protected close(): void {
        this.pageInteraction.stop();
    }

    defaultStart(): void {
        this.pageManager.openPage("result");
    }

    private async returnTo(pageId: string): Promise<void> {
        const back = PageManager.getBackIndex(pageId);
        if (back <= 0) {
            console.warn(`戻り先のページが履歴にありません: ${pageId}`);
            return;
        }
        GameProcessing.quit();
        await MusicManager.fadeOutBGM(150);
        await this.pageManager.backPage(back);
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

    private setPageAnimation() {
        this.pageManager.g$pages.forEach((page) => {
            page.setOpenAnimation(
                [
                    {
                        filter: "blur(0.5vh)",
                        transform: "translate(0, -0.3vh)",
                        opacity: 0,
                    },
                    {
                        transform: "",
                        opacity: 1,
                    },
                ],
                {
                    duration: 400,
                    direction: "normal",
                    iterations: 1,
                    easing: "ease-in-out",
                }
            );
            page.setCloseAnimation(
                [
                    {
                        opacity: 1,
                    },
                    {
                        filter: "blur(1vh)",
                        scale: 1.2,
                        opacity: 0,
                    },
                ],
                {
                    duration: 300,
                    direction: "normal",
                    iterations: 1,
                    easing: "ease-in",
                }
            );
        });
    }
}
