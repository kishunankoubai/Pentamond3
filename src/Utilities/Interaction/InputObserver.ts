import { getMaxElements } from "../Common";
import { MyEventListener } from "../MyEventListener";

export type InputInfo = {
    readonly name: string;
    readonly time: number;
};

export abstract class InputObserver extends MyEventListener {
    protected validInputs: InputInfo[] = [];
    protected isValid: boolean = false;
    protected abstract type: string;

    abstract start(): void;
    abstract stop(): void;

    protected onValidInput(inputName: string): void {
        if (!this.isValid) return;
        if (this.validInputs.some((input) => input.name == inputName)) return;
        const input: InputInfo = {
            name: inputName,
            time: Date.now(),
        };
        this.validInputs.push(input);
        this.executeEvent("inputValid", input);
        this.executeEvent(`inputValid-${inputName}`, input);
    }

    protected onInvalidInput(inputName: string): void {
        if (!this.isValid) return;
        const input = this.validInputs.find((input) => input.name == inputName);
        if (!input) return;
        this.validInputs = this.validInputs.filter((input) => input.name != inputName);
        this.executeEvent("inputInvalid", input);
        this.executeEvent(`inputInvalid-${inputName}`, input);
    }

    get g$type(): string {
        return this.type;
    }

    get g$isValid(): boolean {
        return this.isValid;
    }

    get g$latestInput(): InputInfo | null {
        return this.validInputs.at(-1) || null;
    }

    get g$latestInputName(): string {
        return this.validInputs.at(-1)?.name || "";
    }

    get g$latestInputTime(): number {
        return this.validInputs.at(-1)?.time || -1;
    }

    get g$latestPressingKey(): string {
        return this.g$latestInputName;
    }

    get g$latestPressTime(): number {
        return this.g$latestInputTime;
    }

    get g$oldestPressingKey(): string {
        return this.validInputs[0]?.name || "";
    }

    get g$oldestPressTime(): number {
        return this.validInputs[0]?.time || -1;
    }

    get g$validInputNames(): string[] {
        return this.validInputs.map((input) => input.name);
    }

    existsValid(inputNames: string | string[]): boolean {
        const names = Array.isArray(inputNames) ? inputNames : [inputNames];
        return this.validInputs.some((input) => names.includes(input.name));
    }

    isPressing(inputName: string): boolean {
        return this.existsValid(inputName);
    }

    arePressing(inputNames: string[]): boolean {
        return this.areEveryValid(inputNames);
    }

    existsPressingKey(inputNames: string[]): boolean {
        return this.existsValid(inputNames);
    }

    getPressTime(inputName: string): number {
        return this.validInputs.find((input) => input.name === inputName)?.time ?? -1;
    }

    getLatestPressingKey(inputNames: string[]): string {
        return this.getLatest(inputNames)?.name || "";
    }

    getOldestPressingKey(inputNames: string[]): string {
        return this.validInputs.find((input) => inputNames.includes(input.name))?.name || "";
    }

    getAllPressingKeys(inputNames: string[]): string[] {
        return this.validInputs.filter((input) => inputNames.includes(input.name)).map((input) => input.name);
    }

    areEveryValid(inputNames: string | string[]): boolean {
        const names = Array.isArray(inputNames) ? inputNames : [inputNames];
        const validInputNames = this.g$validInputNames;
        return names.every((inputName) => validInputNames.includes(inputName));
    }

    getLatest(inputNames: string | string[]): InputInfo | null {
        const names = Array.isArray(inputNames) ? inputNames : [inputNames];
        const inputs = this.validInputs.filter((input) => names.includes(input.name));
        if (!inputs.length) return null;
        return getMaxElements(inputs, (input) => input.time)[0];
    }
}
