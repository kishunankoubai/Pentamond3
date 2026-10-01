import { globalValues } from "./Global";
import { GamepadConfig, gamepadConfigPresets } from "./Settings";
import { inputManager } from "./Utilities/Interaction/InputManager";
import { GamepadObserver } from "./Utilities/Interaction/GamepadObserver";
import { InputInfo, InputObserver } from "./Utilities/Interaction/InputObserver";
import { PageInteraction } from "./Utilities/Interaction/PageInteraction";
import { MyEvent } from "./Utilities/MyEventListener";
import { sceneManager } from "./Utilities/SceneManager";

type ControllerAction = keyof GamepadConfig;

const actionLabels: Record<ControllerAction, string> = {
    moveLeft: "左移動",
    moveRight: "右移動",
    moveDown: "下移動",
    put: "設置",
    spinLeft: "左回転",
    spinRight: "右回転",
    unput: "一手戻し",
    hold: "ホールド",
    removeLine: "消去",
    pause: "ポーズ",
};

const actions = Object.keys(actionLabels) as ControllerAction[];
const maxBindingsPerAction = 3;

type StoredControllerSettings = {
    version: 1;
    selectedSlot: number;
    customConfigs: GamepadConfig[];
};

export class ControllerSettingManager {
    static readonly storageKey = "Pentamond3-controllerSettings";
    private static selectedSlot = 0;
    private static customConfigs: GamepadConfig[] = Array.from({ length: 3 }, () => this.createDefaultConfig());
    private static playerSlots: number[] = [];
    private static inputEvent: MyEvent | null = null;
    private static waitingAction: ControllerAction | null = null;
    private static waitingSince = 0;
    private static openedAction: ControllerAction | null = null;

    static read(): void {
        this.reset(false);
        if (globalValues.nosave) return;

        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return;
            const data = JSON.parse(raw) as Partial<StoredControllerSettings>;
            if (Number.isInteger(data.selectedSlot) && 0 <= data.selectedSlot! && data.selectedSlot! <= 3) this.selectedSlot = data.selectedSlot!;
            if (Array.isArray(data.customConfigs)) {
                data.customConfigs.slice(0, 3).forEach((config, index) => {
                    if (this.isValidConfig(config)) this.customConfigs[index] = this.normalizeConfig(config);
                });
            }
        } catch (error) {
            console.warn("コントローラー設定を読み込めませんでした", error);
        }
    }

    static setup(): void {
        this.close();
        document.querySelectorAll<HTMLElement>("#controllerSetting [data-controller-slot]").forEach((button) => {
            button.addEventListener("click", () => this.selectSlot(Number(button.dataset.controllerSlot)));
        });
        document.querySelectorAll<HTMLElement>("#controllerSetting [data-controller-action]").forEach((button) => {
            button.addEventListener("click", () => this.openActionSetting(button.dataset.controllerAction as ControllerAction));
        });
        document.getElementById("controllerSettingReset")?.addEventListener("click", () => {
            if (this.selectedSlot === 0) return;
            this.customConfigs[this.selectedSlot - 1] = this.createDefaultConfig();
            this.save();
            this.render();
            this.setStatus(`編集用${this.selectedSlot}を初期配置へ戻しました。`);
        });
        document.getElementById("controllerBindingAdd")?.addEventListener("click", () => this.beginAssignment());
        document.querySelectorAll<HTMLElement>("#playerControllerSetting [data-player-index][data-controller-slot]").forEach((button) => {
            button.addEventListener("click", () => this.selectPlayerSlot(Number(button.dataset.playerIndex), Number(button.dataset.controllerSlot)));
        });

        this.inputEvent = inputManager.addHandler("inputValid", ([input, info]: [InputObserver, InputInfo]) => this.captureInput(input, info));
        sceneManager.g$currentPageManager?.addHandler("changePage", (pageId: string) => {
            if (pageId === "controllerSetting") this.render();
            else if (pageId === "playerControllerSetting") this.renderPlayerSlots();
            if (pageId !== "controllerBindingSetting") this.cancelAssignment();
        });
        this.render();
    }

    static close(): void {
        if (this.inputEvent) inputManager.removeEvent(this.inputEvent);
        this.inputEvent = null;
        this.cancelAssignment();
    }

    static getSelectedConfig(): GamepadConfig {
        return this.getConfig(this.selectedSlot);
    }

    static startPlayerSelection(playerNumber: number): void {
        this.playerSlots = Array.from({ length: playerNumber }, () => 0);
        document.querySelectorAll<HTMLElement>("#playerControllerSetting .playerControllerRow").forEach((row) => {
            row.style.display = Number(row.dataset.playerIndex) < playerNumber ? "flex" : "none";
        });
        this.renderPlayerSlots();
    }

    static getPlayerConfigs(playerNumber: number): GamepadConfig[] {
        return Array.from({ length: playerNumber }, (_, index) => this.getConfig(this.playerSlots[index] ?? 0));
    }

    static reset(removeStorage: boolean = true): void {
        this.selectedSlot = 0;
        this.customConfigs = Array.from({ length: 3 }, () => this.createDefaultConfig());
        this.playerSlots = [];
        if (removeStorage) localStorage.removeItem(this.storageKey);
        this.cancelAssignment();
        this.render();
        this.renderPlayerSlots();
    }

    private static selectSlot(slot: number): void {
        if (!this.isValidSlot(slot)) return;
        this.cancelAssignment();
        this.selectedSlot = slot;
        this.save();
        this.render();
        this.setStatus(slot === 0 ? "初期配置を使用します。" : `編集用${slot}を使用します。操作を選ぶと割り当てを編集できます。`);
    }

    private static selectPlayerSlot(playerIndex: number, slot: number): void {
        if (!this.isValidSlot(slot) || playerIndex < 0 || playerIndex >= this.playerSlots.length) return;
        this.playerSlots[playerIndex] = slot;
        this.renderPlayerSlots();
    }

    private static openActionSetting(action: ControllerAction): void {
        if (!actions.includes(action)) return;
        if (this.selectedSlot === 0) {
            this.setStatus("初期配置は読み取り専用です。編集用1～3を選んでください。");
            return;
        }
        this.openedAction = action;
        this.renderBindingPage(action);
        sceneManager.g$currentPageManager?.openPage("controllerBindingSetting");
    }

    private static renderBindingPage(action: ControllerAction): void {
        const title = document.getElementById("controllerBindingTitle");
        const list = document.getElementById("controllerBindingList");
        if (!list) return;
        if (title) title.textContent = `${actionLabels[action]}の割り当て`;
        list.replaceChildren();

        const inputs = this.customConfigs[this.selectedSlot - 1][action];
        inputs.forEach((input, index) => {
            const button = document.createElement("div");
            button.className = "button controllerBindingDelete";
            button.dataset.xy = `[0,${index}]`;
            button.tabIndex = 0;
            button.textContent = `${this.formatInput(input)} を削除`;
            button.addEventListener("click", () => this.deleteBinding(action, input));
            button.addEventListener("mouseover", () => button.focus());
            button.addEventListener("mouseleave", () => {
                if (document.activeElement === button) button.blur();
            });
            list.appendChild(button);
        });
        if (!inputs.length) {
            const empty = document.createElement("div");
            empty.className = "text controllerBindingEmpty";
            empty.textContent = "登録なし";
            list.appendChild(empty);
        }

        const addButton = document.getElementById("controllerBindingAdd");
        const backButton = document.querySelector<HTMLElement>("#controllerBindingSetting .back");
        if (addButton) {
            addButton.dataset.xy = `[0,${inputs.length}]`;
            addButton.tabIndex = 0;
            addButton.setAttribute("aria-disabled", String(inputs.length >= maxBindingsPerAction));
        }
        if (backButton) {
            backButton.dataset.xy = `[0,${inputs.length + 1}]`;
            backButton.tabIndex = 0;
        }
    }

    private static beginAssignment(): void {
        if (!this.openedAction || this.selectedSlot === 0) return;
        if (this.customConfigs[this.selectedSlot - 1][this.openedAction].length >= maxBindingsPerAction) {
            const status = document.getElementById("controllerBindingStatus");
            if (status) status.textContent = `同じ操作に登録できる入力は${maxBindingsPerAction}つまでです。`;
            return;
        }
        this.waitingAction = this.openedAction;
        this.waitingSince = Date.now();
        PageInteraction.inputBlocked = true;
        document.getElementById("controllerBindingAdd")?.classList.add("waitingInput");
        const status = document.getElementById("controllerBindingStatus");
        if (status) status.textContent = "追加するコントローラー入力を押してください。";
    }

    private static captureInput(input: InputObserver, info: InputInfo): void {
        if (!this.waitingAction || !(input instanceof GamepadObserver) || info.time <= this.waitingSince) return;
        if (!/^(button:\d+|stick:[+-]\d+)$/.test(info.name)) return;

        const action = this.waitingAction;
        const config = this.customConfigs[this.selectedSlot - 1];
        if (!config[action].includes(info.name) && config[action].length >= maxBindingsPerAction) {
            this.cancelAssignment();
            const status = document.getElementById("controllerBindingStatus");
            if (status) status.textContent = `同じ操作に登録できる入力は${maxBindingsPerAction}つまでです。`;
            return;
        }
        actions.forEach((registeredAction) => {
            config[registeredAction] = config[registeredAction].filter((registeredInput) => registeredInput !== info.name);
        });
        config[action].push(info.name);
        this.save();
        this.waitingAction = null;
        this.render();
        this.setStatus(`${this.formatInput(info.name)}を${actionLabels[action]}へ追加しました。`);
        sceneManager.g$currentPageManager?.backPage(1);
        PageInteraction.inputBlocked = true;
        setTimeout(() => (PageInteraction.inputBlocked = false), 0);
    }

    private static deleteBinding(action: ControllerAction, input: string): void {
        if (this.selectedSlot === 0) return;
        this.customConfigs[this.selectedSlot - 1][action] = this.customConfigs[this.selectedSlot - 1][action].filter((registeredInput) => registeredInput !== input);
        this.save();
        this.render();
        this.setStatus(`${actionLabels[action]}から${this.formatInput(input)}を削除しました。`);
        sceneManager.g$currentPageManager?.backPage(1);
    }

    private static cancelAssignment(): void {
        this.waitingAction = null;
        document.getElementById("controllerBindingAdd")?.classList.remove("waitingInput");
        const status = document.getElementById("controllerBindingStatus");
        if (status) status.textContent = "現在の割り当てを削除するか、新しい入力を追加できます。";
        PageInteraction.inputBlocked = false;
    }

    private static render(): void {
        const config = this.getSelectedConfig();
        document.querySelectorAll<HTMLElement>("#controllerSetting [data-controller-slot]").forEach((button) => {
            button.classList.toggle("selectedValue", Number(button.dataset.controllerSlot) === this.selectedSlot);
        });
        document.querySelectorAll<HTMLElement>("#controllerSetting [data-controller-action]").forEach((button) => {
            const action = button.dataset.controllerAction as ControllerAction;
            const label = button.querySelector<HTMLElement>(".controllerMappingLabel");
            const value = button.querySelector<HTMLElement>(".controllerMappingValue");
            if (label) label.textContent = actionLabels[action];
            if (value) value.textContent = config[action].length ? config[action].map((input) => this.formatInput(input)).join(" / ") : "登録なし";
            button.classList.toggle("readOnlyMapping", this.selectedSlot === 0);
        });
        const resetButton = document.getElementById("controllerSettingReset") as HTMLButtonElement | null;
        if (resetButton) resetButton.disabled = this.selectedSlot === 0;
    }

    private static renderPlayerSlots(): void {
        document.querySelectorAll<HTMLElement>("#playerControllerSetting [data-player-index][data-controller-slot]").forEach((button) => {
            const playerIndex = Number(button.dataset.playerIndex);
            button.classList.toggle("selectedValue", this.playerSlots[playerIndex] === Number(button.dataset.controllerSlot));
        });
    }

    private static setStatus(message: string): void {
        const status = document.getElementById("controllerSettingStatus");
        if (status) status.textContent = message;
    }

    private static save(): void {
        if (globalValues.nosave) return;
        const data: StoredControllerSettings = { version: 1, selectedSlot: this.selectedSlot, customConfigs: structuredClone(this.customConfigs) };
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    private static getConfig(slot: number): GamepadConfig {
        const config = slot === 0 ? gamepadConfigPresets[0] : this.customConfigs[slot - 1];
        return structuredClone(config);
    }

    private static createDefaultConfig(): GamepadConfig {
        return structuredClone(gamepadConfigPresets[0]);
    }

    private static isValidSlot(slot: number): boolean {
        return Number.isInteger(slot) && 0 <= slot && slot <= 3;
    }

    private static isValidConfig(config: unknown): config is GamepadConfig {
        if (!config || typeof config !== "object") return false;
        const candidate = config as Partial<GamepadConfig>;
        return actions.every((action) => Array.isArray(candidate[action]) && candidate[action]!.every((input) => typeof input === "string" && /^(button:\d+|stick:[+-]\d+)$/.test(input)));
    }

    private static normalizeConfig(config: GamepadConfig): GamepadConfig {
        const normalized = structuredClone(config);
        const usedInputs = new Set<string>();
        actions.forEach((action) => {
            const inputs: string[] = [];
            normalized[action].forEach((input) => {
                if (usedInputs.has(input) || inputs.length >= maxBindingsPerAction) return;
                usedInputs.add(input);
                inputs.push(input);
            });
            normalized[action] = inputs;
        });
        return normalized;
    }

    private static formatInput(input: string): string {
        const button = input.match(/^button:(\d+)$/);
        if (button) return `ボタン${button[1]}`;
        const stick = input.match(/^stick:([+-])(\d+)$/);
        if (stick) return `スティック${stick[2]}${stick[1] === "+" ? "＋" : "－"}`;
        return input;
    }
}
