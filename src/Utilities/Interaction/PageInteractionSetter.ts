import { SceneSetter } from "../SceneSetter";
import { PageInteraction } from "./PageInteraction";

export class PageInteractionSetter extends SceneSetter {
    private pageInteraction: PageInteraction;

    constructor(pageInteraction: PageInteraction) {
        super(pageInteraction.g$scene);
        this.pageInteraction = pageInteraction;
    }

    protected progressSet(): void {
        this.addElementEvent();
        this.pageInteraction.g$scene.g$pageManager.addHandler("changePage", (pageId: string) => {
            this.pageInteraction.setInteraction();
        });
    }

    private addElementEvent() {
        //マウス操作との整合
        document.querySelectorAll<HTMLElement>("[data-xy]").forEach((element) => {
            element.addEventListener("mouseover", () => {
                element.focus();
            });

            element.addEventListener("mouseleave", () => {
                if (document.activeElement == element) (element as HTMLElement).blur();
            });

            element.addEventListener("click", () => {
                PageInteraction.updateLastOperateTime();
            });

            element.tabIndex = 0;
        });

        document.addEventListener("mousemove", () => {
            document.body.classList.remove("cursorHidden");
        });

        //input要素を触った後にそれを含む要素にfocusさせる
        document.querySelectorAll<HTMLElement>(".rangeContainer[data-mapping]").forEach((element) => {
            element.querySelectorAll("input").forEach((input) => {
                input.addEventListener("click", () => {
                    element.focus();
                });
            });
        });
    }
}
