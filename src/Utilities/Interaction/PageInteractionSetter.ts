import { SceneSetter } from "../Scene/SceneSetter";
import { PageInteraction } from "./PageInteraction";
import { initializeInteractionElements, isInteractionEnabled, isInteractionFocusable } from "../Element/InteractionElement";

export class PageInteractionSetter extends SceneSetter {
    private pageInteraction: PageInteraction;

    constructor(pageInteraction: PageInteraction) {
        super(pageInteraction.g$scene);
        this.pageInteraction = pageInteraction;
    }

    protected progressSet(): void {
        this.addElementEvent();
        this.pageInteraction.g$scene.g$pageManager.addHandler("changePage", () => {
            this.pageInteraction.setInteraction();
        });
    }

    private addElementEvent() {
        const container = document.querySelector<HTMLElement>(".sceneContainer");
        if (!container) return;
        const controller = new AbortController();
        const options = { signal: controller.signal };
        const findElement = (event: Event) => event.target instanceof Element ? event.target.closest<HTMLElement>("[data-xy]") : null;
        initializeInteractionElements(container);
        const observer = new MutationObserver(() => initializeInteractionElements(container));
        observer.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-xy", "aria-disabled", "disabled", "data-focus-when-disabled"] });
        container.addEventListener("mouseover", (event) => {
            if (document.body.classList.contains("cursorHidden")) return;
            const element = findElement(event);
            if (element && isInteractionFocusable(element)) element.focus({ preventScroll: true });
        }, options);
        container.addEventListener("mouseout", (event) => {
            if (document.body.classList.contains("cursorHidden")) return;
            const element = findElement(event);
            if (element && !(event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) && document.activeElement === element) element.blur();
        }, options);
        container.addEventListener("click", (event) => {
            const element = findElement(event);
            if (element && !isInteractionEnabled(element)) {
                event.preventDefault();
                event.stopImmediatePropagation();
                return;
            }
            if (element) PageInteraction.updateLastOperateTime();
            if (element?.classList.contains("rangeContainer")) element.focus();
        }, { ...options, capture: true });
        document.addEventListener("mousemove", (event) => {
            document.body.classList.remove("cursorHidden");
            const element = findElement(event);
            if (element && isInteractionFocusable(element)) element.focus({ preventScroll: true });
        }, options);
        this.scene.addHandler("sceneEnd", () => {
            controller.abort();
            observer.disconnect();
        }, 1);
    }
}
