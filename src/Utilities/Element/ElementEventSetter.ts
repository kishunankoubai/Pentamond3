import { ElementManager } from "./ElementManager";
import { SceneSetter } from "../SceneSetter";

export class ElementEventSetter extends SceneSetter {
    private elementManager: ElementManager;

    constructor(elementManager: ElementManager) {
        super(elementManager.g$scene);
        this.elementManager = elementManager;
    }

    protected progressSet(): void {
        const controller = new AbortController();
        // 個別ボタンの設定処理が済んでから遷移する。動的なボタンにも適用する。
        document.querySelector(".sceneContainer")?.addEventListener("click", (event) => {
            const element = event.target instanceof Element ? event.target.closest<HTMLElement>(".back, [data-back], [data-page], .subPagePrev, .subPageNext") : null;
            if (!element) return;
            if (element.matches(".back, [data-back]")) this.scene.g$pageManager.backPage(Number.parseInt(element.dataset.back || "1"));
            else if (element.matches("[data-page]")) this.scene.g$pageManager.openPage(element.dataset.page || "");
            else if (element.classList.contains("subPagePrev")) this.elementManager.openSubPageRelatively(-1);
            else this.elementManager.openSubPageRelatively(1);
        }, { signal: controller.signal });
        this.scene.addHandler("sceneEnd", () => controller.abort(), 1);
        // subPageが後から生成されるページもあるため、全ページに初期化処理を登録する。
        document.querySelectorAll<HTMLElement>(".page").forEach((page) => {
            this.scene.g$pageManager.addHandler(`changePage-${page.id}`, () => {
                this.elementManager.initializeSubPage();
            });
        });

        //selector
        document.querySelectorAll<HTMLElement>(".selector").forEach((selector) => {
            // シーンHTMLがDOMに反映された後に、選択肢側の要素も含めて初期化する
            const timer = setTimeout(() => {
                if (!selector.isConnected) return;
                const page = document.getElementById(selector.dataset.page || "");
                if (!page) return;

                //初期設定
                const options = Array.from(page.querySelectorAll<HTMLElement>(`.scrollableContainer .button`));
                const updateSelectorLabel = () => {
                    selector.innerText = options.find((option) => option.classList.contains("selectedValue"))?.textContent?.trim() || "未選択";
                };
                updateSelectorLabel();
                const selectorPageId = selector.closest<HTMLElement>(".page")?.id;
                if (selectorPageId) this.scene.g$pageManager.addHandler(`changePage-${selectorPageId}`, updateSelectorLabel);

                //選択肢の選択時
                options.forEach((option) => {
                    option.addEventListener("click", () => {
                        selector.innerText = option.innerText;
                        options.forEach((opt) => opt.classList.remove("selectedValue"));
                        option.classList.add("selectedValue");
                        this.scene.g$pageManager.backPage(1);
                        this.executeEvent("selectorChanged", selector);
                        this.executeEvent(`selectorChanged-${page.id}`, selector);
                    });
                });

                //selectorの選択ページにおいて、選択済みのものがあるならそれにfocusする
                this.scene.g$pageManager.addHandler(`changePage-${page.id}`, () => {
                    options.find((option) => option.classList.contains("selectedValue"))?.focus();
                });
            }, 0);
            this.scene.addHandler("sceneEnd", () => clearTimeout(timer), 1);
        });
    }
}
