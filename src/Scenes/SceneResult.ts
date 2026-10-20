import { ElementEventSetter } from "../Utilities/Element/ElementEventSetter";
import { ElementManager } from "../Utilities/Element/ElementManager";
import { PageInteraction } from "../Utilities/Interaction/PageInteraction";
import { PageInteractionSetter } from "../Utilities/Interaction/PageInteractionSetter";
import { MusicManager } from "../Utilities/Music/MusicManager";
import { Scene } from "../Utilities/Scene/SceneManager";
import { DynamicTextSetter } from "../Utilities/Text/DynamicTextSetter";
import { TalkManager } from "../Utilities/Text/TalkManager";
import { GameProcessing } from "../GameProcessing/GameProcessing";
import { PageManager } from "../Utilities/Page/PageManager";
import { applyPageTransitions, setupMenuFeedback } from "../UI/Presentation";
import { spaceJapaneseHTML } from "../Utilities/Text/JapaneseText";

export class SceneResult extends Scene {
    private elementManager: ElementManager;
    private pageInteraction: PageInteraction;
    private talkManager: TalkManager;
    constructor() {
        super("src/HTML/SceneResult.html");
        this.elementManager = new ElementManager(this);
        this.pageInteraction = new PageInteraction(this);
        setupMenuFeedback(this.pageInteraction);
        this.talkManager = new TalkManager(this);
        this.talkManager.talkPanel.s$htmlResolver = spaceJapaneseHTML;
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
        MusicManager.playExclusiveBGM("おかたづけ");
        document.getElementById("resultRestartButton")?.addEventListener("click", () => GameProcessing.restartNormal());
        document.getElementById("resultPlayPrepareButton")?.addEventListener("click", () => this.returnTo("playPrepare"));
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
        await MusicManager.fadeOutBGM(150);
        if (await this.pageManager.backPage(back)) GameProcessing.quit();
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
        applyPageTransitions(this);
    }
}
