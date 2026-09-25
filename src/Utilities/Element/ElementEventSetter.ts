import { ElementManager } from "./ElementManager";
import { SceneSetter } from "../SceneSetter";

export class ElementEventSetter extends SceneSetter {
    private elementManager: ElementManager;

    constructor(elementManager: ElementManager) {
        super(elementManager.g$scene);
        this.elementManager = elementManager;
    }

    protected progressSet(): void {
        //pageを戻る
        document.querySelectorAll<HTMLElement>(".back, [data-back]").forEach((backElement) => {
            backElement.addEventListener("click", () => {
                const back = parseInt(backElement.dataset.back || "1");
                this.scene.g$pageManager.backPage(back);
            });
        });

        //page遷移
        document.querySelectorAll<HTMLElement>("[data-page]").forEach((element) => {
            element.addEventListener("click", () => this.scene.g$pageManager.openPage(element.dataset.page || ""));
        });

        //subPage遷移
        document.querySelectorAll<HTMLElement>(".subPagePrev").forEach((prev) => {
            prev.addEventListener("click", () => this.elementManager.openSubPageRelatively(-1));
        });
        document.querySelectorAll<HTMLElement>(".subPageNext").forEach((next) => {
            next.addEventListener("click", () => this.elementManager.openSubPageRelatively(1));
        });
        document.querySelectorAll<HTMLElement>(".page:has(.subPage)").forEach((page) => {
            this.scene.g$pageManager.addHandler(`changePage-${page.id}`, () => {
                this.elementManager.initializeSubPage();
            });
        });

        //selector
        document.querySelectorAll<HTMLElement>(".selector").forEach((selector) => {
            const page = document.getElementById(`#${selector.dataset.page}`);
            if (!page) return;

            //初期設定
            const options = Array.from(page.querySelectorAll<HTMLElement>(`.scrollableContainer .option`));
            selector.innerText = options.find((option) => option.classList.contains("selectedOption"))?.innerText || "未選択";

            //選択肢の選択時
            options.forEach((option) => {
                option.addEventListener("click", () => {
                    selector.innerText = option.innerText;
                    options.forEach((opt) => opt.classList.remove("selectedOption"));
                    option.classList.add("selectedOption");
                    this.scene.g$pageManager.backPage(1);
                    this.executeEvent("selectorChanged", selector);
                    this.executeEvent(`selectorChanged-${page.id}`, selector);
                });
            });

            //selectorの選択ページにおいて、選択済みのものがあるならそれにfocusする
            this.scene.g$pageManager.addHandler(`changePage-${page.id}`, () => {
                options.find((option) => option.classList.contains("selectedOption"))?.focus();
            });
        });
    }
}
