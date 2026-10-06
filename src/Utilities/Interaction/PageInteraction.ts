import { Scene } from "../SceneManager";
import { inputManager } from "./InputManager";
import { InputInfo, InputObserver } from "./InputObserver";
import { MyEvent } from "../MyEventListener";
import { MusicManager } from "../Music/MusicManager";
import { initializeInteractionElements, isInteractionEnabled } from "../Element/InteractionElement";

type InteractionElement = {
    element: HTMLElement;
    coordinate: [number, number];
};

export class PageInteraction {
    private static lastOperateTime: number = Date.now();
    static inputBlocked = false;
    static operateDebounce: number = 300;
    private static firstFocus: boolean = false;
    private scene: Scene;

    private isValid: boolean = false;

    private interactionElements: InteractionElement[] = [];
    private backElement: InteractionElement | undefined = undefined;
    private inputEvents: MyEvent[] = [];
    private readonly focusHandler = (event: FocusEvent) => {
        if (event.target instanceof HTMLElement && event.target.matches("[data-xy]")) {
            MusicManager.get("フォーカス")?.play();
        }
    };
    private readonly clickHandler = (event: MouseEvent) => {
        if (event.target instanceof HTMLElement && event.target.closest("[data-xy]")) {
            MusicManager.get("ボタン")?.play();
        }
    };

    constructor(scene: Scene, private readonly acceptsInput: (input: InputObserver) => boolean = () => true) {
        this.scene = scene;
    }

    get g$scene(): Scene {
        return this.scene;
    }

    private get g$validElements(): InteractionElement[] {
        return this.interactionElements.filter(
            ({ element }) =>
                !element.classList.contains("closing") &&
                element.getClientRects().length > 0 &&
                isInteractionEnabled(element)
        );
    }

    start() {
        if (this.isValid) return;
        this.isValid = true;
        document.addEventListener("focusin", this.focusHandler);
        document.addEventListener("click", this.clickHandler);
    }

    stop() {
        if (!this.isValid) return;
        this.isValid = false;
        document.removeEventListener("focusin", this.focusHandler);
        document.removeEventListener("click", this.clickHandler);
        inputManager.removeEvent(this.inputEvents);
        this.inputEvents = [];
    }

    setInteraction() {
        inputManager.removeEvent(this.inputEvents);
        this.inputEvents = [];
        this.inputEvents.push(
            inputManager.addHandler("inputValid", () => {
                document.body.classList.add("cursorHidden");
            })
        );

        this.getInteractionElements();
        if (!this.interactionElements.length) return;

        if (PageInteraction.firstFocus) {
            const elements = this.g$validElements;
            if (elements.length) elements[0].element.focus();

            PageInteraction.firstFocus = false;
        }

        const handler = (item: [InputObserver, InputInfo]) => {
            if (!this.isValid || PageInteraction.inputBlocked || !this.acceptsInput(item[0])) return;
            this.getInteractionElements();
            const elements = this.g$validElements;
            if (elements.length) item[1].consumed = true;
            if (Date.now() - PageInteraction.lastOperateTime <= PageInteraction.operateDebounce) return;
            const activeElement = elements.find((element) => element.element == document.activeElement);
            if (!activeElement) {
                if (elements.length) elements[0].element.focus();
                return;
            }

            this.proceedInteraction(activeElement, item[1].name);
        };

        this.inputEvents.push(inputManager.addHandler("inputValid", handler.bind(this)));
    }

    static updateLastOperateTime() {
        PageInteraction.lastOperateTime = Date.now();
    }

    private getInteractionElements() {
        const pageManager = this.scene.g$pageManager;
        if (!pageManager) {
            this.interactionElements = [];
            return;
        }

        const page = pageManager.g$currentPage?.g$element;
        if (page) initializeInteractionElements(page);
        const elements = Array.from(page?.querySelectorAll<HTMLElement>("[data-xy]") || []);
        this.interactionElements = elements.map((element) => ({
            element: element,
            coordinate: JSON.parse(element.dataset.xy || "[0,0]") as [number, number],
        }));
        this.backElement = this.interactionElements.find((element) => element.element.classList.contains("back"));
    }

    private getInteractionElementRelatively(activeElement: InteractionElement, [dx, dy]: [number, number]) {
        const [nowX, nowY] = activeElement.coordinate;
        const horizontal = dx !== 0;
        const direction = horizontal ? dx : dy;
        const currentPrimary = horizontal ? nowX : nowY;
        const currentSecondary = horizontal ? nowY : nowX;
        const candidates = this.g$validElements
            .filter(({ element }) => element !== activeElement.element)
            .map((candidate) => {
                const [x, y] = candidate.coordinate;
                const primary = horizontal ? x : y;
                const secondary = horizontal ? y : x;
                return {
                    candidate,
                    directionalDistance: (primary - currentPrimary) * direction,
                    secondaryDistance: Math.abs(secondary - currentSecondary),
                };
            })
            // 同じ列・行だけしかない場合に、別方向へ移動してしまうのを防ぐ。
            .filter(({ directionalDistance }) => directionalDistance !== 0);

        if (!candidates.length) return activeElement;

        const forwardCandidates = candidates.filter(({ directionalDistance }) => directionalDistance > 0);
        const wrapAlignedCandidates = candidates.filter(({ directionalDistance, secondaryDistance }) => directionalDistance < 0 && secondaryDistance === 0);
        let movementCandidates = forwardCandidates.length ? forwardCandidates : candidates;
        let targetDirectionalDistance = Math.min(...movementCandidates.map(({ directionalDistance }) => directionalDistance));
        const nearestForwardCandidates = movementCandidates.filter(({ directionalDistance }) => directionalDistance === targetDirectionalDistance);

        // 次の列・行に現在位置と一直線の要素がない場合は、一直線上の折り返しを優先する。
        if (wrapAlignedCandidates.length && (!forwardCandidates.length || !nearestForwardCandidates.some(({ secondaryDistance }) => secondaryDistance === 0))) {
            movementCandidates = wrapAlignedCandidates;
            targetDirectionalDistance = Math.min(...movementCandidates.map(({ directionalDistance }) => directionalDistance));
        }

        return movementCandidates
            .filter(({ directionalDistance }) => directionalDistance === targetDirectionalDistance)
            .sort((a, b) => a.secondaryDistance - b.secondaryDistance)[0].candidate;
    }

    private proceedInteraction(activeElement: InteractionElement, inputName: string) {
        if (activeElement.element.classList.contains("rangeContainer")) {
            const input = activeElement.element.querySelector<HTMLInputElement>("input");
            if (["ArrowUp", "KeyW", "button:12", "stick:-1"].includes(inputName)) {
                input?.stepUp();
                input?.dispatchEvent(new Event("input"));
            }
            if (["ArrowDown", "KeyS", "button:13", "stick:+1"].includes(inputName)) {
                input?.stepDown();
                input?.dispatchEvent(new Event("input"));
            }
            return;
        }

        if (this.backElement) {
            if (["KeyX", "Escape", "Backspace", "button:0"].includes(inputName)) {
                PageInteraction.firstFocus = true;
                this.backElement.element.click();
                return;
            }
        }

        if (["ArrowUp", "KeyW", "button:12", "stick:-1"].includes(inputName)) {
            const nextElement = this.getInteractionElementRelatively(activeElement, [0, -1]);
            nextElement.element.focus();
        }

        if (["ArrowDown", "KeyS", "button:13", "stick:+1"].includes(inputName)) {
            const nextElement = this.getInteractionElementRelatively(activeElement, [0, 1]);
            nextElement.element.focus();
        }

        if (["ArrowLeft", "KeyA", "button:14", "stick:-0"].includes(inputName)) {
            const nextElement = this.getInteractionElementRelatively(activeElement, [-1, 0]);
            nextElement.element.focus();
        }

        if (["ArrowRight", "KeyD", "button:15", "stick:+0"].includes(inputName)) {
            const nextElement = this.getInteractionElementRelatively(activeElement, [1, 0]);
            nextElement.element.focus();
        }

        if (["Enter", "Space", "KeyZ", "button:1"].includes(inputName)) {
            PageInteraction.firstFocus = true;
            activeElement.element.click();
        }
    }
}
