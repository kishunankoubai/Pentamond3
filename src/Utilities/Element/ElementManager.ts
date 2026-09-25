import { mod } from "../Common";
import { MyEventListener } from "../MyEventListener";
import { Scene } from "../SceneManager";

export class ElementManager extends MyEventListener {
    private scene: Scene;

    constructor(scene: Scene) {
        super();
        this.scene = scene;
    }

    get g$scene(): Scene {
        return this.scene;
    }

    getSelectedIndex(selectorName: string): number {
        const page = document.getElementById(selectorName);
        const selector = document.querySelector<HTMLElement>(`.selector[data-page="${CSS.escape(selectorName)}"]`);
        if (!page || !selector) return -1;

        const values = Array.from(page.querySelectorAll<HTMLElement>(".scrollableContainer .button"));
        return values.findIndex((value) => value.classList.contains("selectedValue"));
    }

    selectByIndex(selectorName: string, index: number) {
        const page = document.getElementById(selectorName);
        const selector = document.querySelector<HTMLElement>(`.selector[data-page="${CSS.escape(selectorName)}"]`);
        if (!page || !selector) return;

        const values = Array.from(page.querySelectorAll<HTMLElement>(".scrollableContainer .button"));
        if (index < 0 || values.length <= index) return;

        values.forEach((value) => {
            value.classList.remove("selectedValue");
        });
        values[index].classList.add("selectedValue");
        selector.innerText = values[index].textContent?.trim() || "";
    }

    /**
     * 現在開いているページにsubPageがある場合、最初のページを開く
     */
    initializeSubPage(): void {
        const page = this.scene.g$pageManager.g$currentPage?.g$element;
        if (!page || !page.querySelector(`.subPage`)) return;

        const subPages = page.querySelectorAll<HTMLElement>(".subPage");
        subPages.forEach((subPage) => (subPage.style.display = "none"));
        subPages[0].style.display = "";

        const subPageLabel = page.querySelector(".subPageLabel");
        if (subPageLabel) subPageLabel.innerHTML = `1 / ${subPages.length}`;
    }

    /**
     * 現在開いているページにsubPageがある場合、指定された分だけ移動する
     * @param dIndex 現在開いているページから何ページ移動するか
     */
    openSubPageRelatively(dIndex: number): void {
        const page = this.scene.g$pageManager.g$currentPage?.g$element;
        if (!page || !page.querySelector(`.subPage`)) return;

        const nowIndex = Array.from(page.querySelectorAll<HTMLElement>(".subPage")).findIndex((subPage) => subPage.style.display != "none");
        this.openSubPage(nowIndex + dIndex);
    }

    /**
     * 現在開いているページにsubPageがある場合、指定されたページを開く
     * @param index 指定するsubPageのindex
     * @param eventIgnore イベントを無視するか
     */
    openSubPage(index: number, eventIgnore: boolean = false): void {
        const page = this.scene.g$pageManager.g$currentPage?.g$element;
        if (!page || !page.querySelector(`.subPage`)) return;

        const subPages = Array.from(page.querySelectorAll<HTMLElement>(".subPage"));
        const newIndex = mod(index, subPages.length);
        const subPageLabel = page.querySelector(".subPageLabel");
        subPages.forEach((subPage, i) => {
            if (i == newIndex) {
                if (subPageLabel) subPageLabel.innerHTML = `${newIndex + 1} / ${subPages.length}`;
                subPage.style.display = "";
            } else subPage.style.display = "none";
        });

        if (!eventIgnore) this.executeEvent(["openSubPage", `openSubPage-${page.id}`, `openSubPage-${page.id}-${newIndex}`], subPages[newIndex]);
    }

    static scrollToCenter(element: HTMLElement): void {
        const y = element.clientHeight / 2 + element.getBoundingClientRect().y;
        const parent = element.parentElement;
        if (!parent) return;

        const parentY = parent.clientHeight / 2 + parent.getBoundingClientRect().y;
        if (Math.abs(y - parentY) > (parent.clientHeight / 2) * 0.6) {
            element.scrollIntoView({
                block: "center",
                behavior: "smooth",
            });
        }
    }
}
