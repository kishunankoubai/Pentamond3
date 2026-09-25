import { getMaxElements } from "../Common";
import { Scene } from "../SceneManager";
import { inputManager } from "./InputManager";
import { InputInfo, InputObserver } from "./InputObserver";
import { MyEvent } from "../MyEventListener";

type InteractionElement = {
    element: HTMLElement;
    coordinate: [number, number];
};

export class PageInteraction {
    private static lastOperateTime: number = Date.now();
    static operateDebounce: number = 300;
    private static firstFocus: boolean = false;
    private scene: Scene;

    private isValid: boolean = false;

    private interactionElements: InteractionElement[] = [];
    private backElement: InteractionElement | undefined = undefined;
    private inputEvents: MyEvent[] = [];

    constructor(scene: Scene) {
        this.scene = scene;
    }

    get g$scene(): Scene {
        return this.scene;
    }

    private get g$validElements(): InteractionElement[] {
        return this.interactionElements.filter(({ element }) => !element.classList.contains("closing"));
    }

    start() {
        if (this.isValid) return;
        this.isValid = true;
    }

    stop() {
        if (!this.isValid) return;
        this.isValid = false;
        inputManager.removeEvent(this.inputEvents);
        this.inputEvents = [];
    }

    setInteraction() {
        inputManager.removeEvent(this.inputEvents);
        this.inputEvents = [];
        this.inputEvents.push(inputManager.addHandler("inputValid", () => {
            document.body.classList.add("cursorHidden");
        }));

        this.getInteractionElements();
        if (!this.interactionElements.length) return;

        if (PageInteraction.firstFocus) {
            const elements = this.g$validElements;
            if (elements.length) elements[0].element.focus();

            PageInteraction.firstFocus = false;
        }

        const handler = (item: [InputObserver, InputInfo]) => {
            if (!this.isValid) return;
            if (Date.now() - PageInteraction.lastOperateTime <= PageInteraction.operateDebounce) return;

            const elements = this.g$validElements;
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

        const elements = Array.from(pageManager.g$currentPage?.g$element?.querySelectorAll<HTMLElement>("[data-xy]") || []);
        this.interactionElements = elements.map((element) => ({
            element: element,
            coordinate: JSON.parse(element.dataset.xy || "[0,0]") as [number, number],
        }));
        this.backElement = this.interactionElements.find((element) => element.element.classList.contains("back"));
    }

    private getInteractionElementRelatively(activeElement: InteractionElement, [dx, dy]: [number, number]) {
        const [nowX, nowY] = activeElement.coordinate;

        let focusElement = getMaxElements(
            this.interactionElements.filter(({ coordinate: [x, y] }) => x == nowX + (dx ?? x - nowX) && y == nowY + (dy ?? y - nowY)),
            ({ coordinate: [x, y] }) => -Math.hypot(x - nowX, y - nowY)
        );

        // if (!focusElement.length) {
        //     focusElement = getMaxElements(
        //         this.interactionElements.filter(({ coordinate: [x, y] }) => (x == nowX + (dx ?? x - nowX) || y == nowY + (dy ?? y - nowY)) && x != nowX && y != nowY),
        //         ({ coordinate: [x, y] }) => -Math.max(Math.abs(x - nowX - dx), Math.abs(y - nowY - dy))
        //     );
        // }
        if (!focusElement.length) {
            if (!this.interactionElements.some(({ coordinate: [x, y] }) => (dx && x != nowX) || (dy && y != nowY)))
                focusElement = [this.interactionElements.find(({ coordinate: [x, y] }) => x == nowX && y == nowY)!];
        }

        // if (!focusElement.length) {
        //     focusElement = getMaxElements(
        //         this.interactionElements.filter(({ coordinate: [x, y] }) => x == (dx ? x : nowX) && y == (dy ? y : nowY) && (x != nowX || y != nowY)),
        //         ({ coordinate: [x, y] }) => -(dx ? 0 : Math.min(Math.sign(dy ?? 0) * y, nowY - y)) - (dy ? 0 : Math.min(Math.sign(dx ?? 0) * x, nowX - x))
        //     );
        // }

        if (!focusElement.length) {
            focusElement = getMaxElements(
                this.interactionElements.filter(({ coordinate: [x, y] }) => {
                    return x != nowX || y != nowY;
                }),
                ({ coordinate: [x, y] }) => -(dx ? 0 : Math.min(Math.sign(dy ?? 0) * y, nowY - y)) - (dy ? 0 : Math.min(Math.sign(dx ?? 0) * x, nowX - x))
            );
            focusElement = getMaxElements(
                focusElement.filter(({ coordinate: [x, y] }) => {
                    return x != nowX || y != nowY;
                }),
                ({ coordinate: [x, y] }) => -Math.hypot(x - nowX, y - nowY)
            );
        }

        // console.log(activeElement.coordinate, focusElement[0]?.coordinate);

        return focusElement.length ? focusElement[0] : activeElement;
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
