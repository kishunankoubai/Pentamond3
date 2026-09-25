import { observe } from "../Common";

export class Page {
    private id: string;
    private readonly element: HTMLElement;
    private layer: number;
    private visible: boolean = false;

    private openAnimation: Animation | null = null;
    private closeAnimation: Animation | null = null;

    constructor(id: string) {
        this.id = id;
        this.element = document.getElementById(id)!;
        this.layer = Number.parseInt(this.element.dataset.layer || "0");
        this.element.style.zIndex = this.layer + "";
    }

    get g$id(): string {
        return this.id;
    }

    get g$element(): HTMLElement {
        return this.element;
    }

    get g$layer(): number {
        return this.layer;
    }

    get g$visible() {
        return this.visible;
    }

    set s$visible(visible: boolean) {
        if (this.visible === visible) return;

        if (visible) {
            this.element.style.display = "flex";
            this.element.style.pointerEvents = "";
            this.element.querySelectorAll<HTMLElement>("*").forEach((element) => {
                element.classList.remove("closing");
            });
            this.cancelAnimations();
            this.openAnimation?.play();
        } else {
            if (this.closeAnimation) {
                this.element.style.pointerEvents = "none";
                this.element.querySelectorAll<HTMLElement>("*").forEach((element) => {
                    element.blur();
                    element.classList.add("closing");
                });
                this.cancelAnimations();
                this.closeAnimation.play();
            } else {
                this.element.style.display = "none";
            }
        }
        this.visible = visible;
    }

    setOpenAnimation(keyframes: Keyframe[] | PropertyIndexedKeyframes | null, options?: number | KeyframeAnimationOptions) {
        if (this.openAnimation) this.openAnimation.cancel();

        this.openAnimation = this.element.animate(keyframes, options);
        this.openAnimation.cancel();
    }

    setCloseAnimation(keyframes: Keyframe[] | PropertyIndexedKeyframes | null, options?: number | KeyframeAnimationOptions) {
        if (this.closeAnimation) this.closeAnimation.cancel();

        this.closeAnimation = this.element.animate(keyframes, options);
        this.closeAnimation.cancel();
        const handler = () => {
            this.element.style.display = "none";
            this.element.style.pointerEvents = "";
            this.element.querySelectorAll<HTMLElement>("*").forEach((element) => {
                element.classList.remove("closing");
            });
            this.closeAnimation?.cancel();
        };
        this.closeAnimation.onfinish = handler;
    }

    closeImmediately() {
        this.cancelAnimations();
        this.element.style.display = "none";
        this.visible = false;
    }

    private cancelAnimations() {
        if (this.openAnimation) this.openAnimation.cancel();
        if (this.closeAnimation) this.closeAnimation.cancel();
    }

    static getLayer(id: string): number {
        const element = document.getElementById(id);
        if (element) return Number.parseInt(element.dataset.layer || "0");
        else return 0;
    }

    hasClosed(maxTime: number = 3000) {
        return observe(() => (this.closeAnimation?.playState || "finished") != "running" && this.element.style.display == "none", maxTime);
    }

    hasOpened(maxTime: number = 3000) {
        return observe(() => (this.openAnimation?.playState || "finished") != "running", maxTime);
    }
}
