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
    }

    protected close(): void {}

    defaultStart(): void {
        this.pageManager.openPage("result");
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
