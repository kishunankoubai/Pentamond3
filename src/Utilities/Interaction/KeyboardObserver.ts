import { InputObserver } from "./InputObserver";

export class KeyboardObserver extends InputObserver {
    protected type: string = "keyboard";
    private keyDownHandler: (e: KeyboardEvent) => void;
    private keyUpHandler: (e: KeyboardEvent) => void;
    constructor() {
        super();
        this.keyDownHandler = (e) => this.onValidInput(e.code);
        this.keyUpHandler = (e) => this.onInvalidInput(e.code);
    }

    start(): void {
        if (this.isValid) return;

        document.addEventListener("keydown", this.keyDownHandler);
        document.addEventListener("keyup", this.keyUpHandler);
        this.isValid = true;
    }

    stop(): void {
        if (!this.isValid) return;

        this.isValid = false;
        document.removeEventListener("keydown", this.keyDownHandler);
        document.removeEventListener("keyup", this.keyUpHandler);
        this.validInputs = [];
    }
}
