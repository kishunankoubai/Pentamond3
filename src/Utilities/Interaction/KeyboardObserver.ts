import { InputObserver } from "./InputObserver";

export class KeyboardObserver extends InputObserver {
    protected type: string = "keyboard";
    private keyDownHandler: (e: KeyboardEvent) => void;
    private keyUpHandler: (e: KeyboardEvent) => void;
    private readonly blurHandler = () => this.validInputs.slice().forEach((input) => this.onInvalidInput(input.name));
    constructor() {
        super();
        this.keyDownHandler = (e) => {
            if (["Tab", "Space", "Enter", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
            this.onValidInput(e.code);
        };
        this.keyUpHandler = (e) => this.onInvalidInput(e.code);
    }

    start(): void {
        if (this.isValid) return;

        document.addEventListener("keydown", this.keyDownHandler);
        document.addEventListener("keyup", this.keyUpHandler);
        window.addEventListener("blur", this.blurHandler);
        this.isValid = true;
    }

    stop(): void {
        if (!this.isValid) return;

        this.isValid = false;
        document.removeEventListener("keydown", this.keyDownHandler);
        document.removeEventListener("keyup", this.keyUpHandler);
        window.removeEventListener("blur", this.blurHandler);
        this.validInputs = [];
    }
}
