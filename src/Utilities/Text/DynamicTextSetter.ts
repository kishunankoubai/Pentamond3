import { SceneSetter } from "../SceneSetter";
import { DynamicText } from "./DynamicText";
import { TalkManager, TalkPanel } from "./TalkManager";

export class DynamicTextSetter extends SceneSetter {
    private talkManager: TalkManager;
    constructor(talkManager: TalkManager) {
        super(talkManager.g$scene);
        this.talkManager = talkManager;
    }

    protected progressSet(): void {
        document.querySelectorAll<HTMLElement>(".autoDynamicText").forEach((element) => {
            const dynamicText = new DynamicText(element.innerHTML);
            dynamicText.s$loopFrequency = parseInt(element.dataset.frequency ?? "50");
            element.innerHTML = "";
            const pageId = element.closest(".page")!.id;

            this.scene.g$pageManager.addHandler(`trueChangePage-${pageId}`, () => {
                element.innerHTML = "";
                dynamicText.reset();
                dynamicText.start();
            });
            dynamicText.addHandler("write", () => {
                element.innerHTML = dynamicText.g$element.innerHTML;
            });
        });

        let talkPage = document.querySelector<HTMLElement>("#talk");
        if (!talkPage) {
            talkPage = document.createElement("div");
            talkPage.classList.add("page");
            talkPage.id = "talk";
            talkPage.dataset.layer = "1";
            const pages = this.scene.g$pageManager.g$pages;
            if (pages.length) pages[0].g$element.after(talkPage);
            else document.querySelector<HTMLElement>(".sceneContainer")!.appendChild(talkPage);
        }
        talkPage = talkPage!;
        this.scene.g$pageManager.addPage(talkPage.id);
        talkPage.appendChild(this.talkManager.talkPanel.g$element);
        talkPage.appendChild(this.talkManager.talkPanel.g$namePanel);
        this.talkManager.talkPanel.g$element.dataset.xy = "[0,0]";
    }
}
