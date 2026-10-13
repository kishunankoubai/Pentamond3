import { globalValues } from "./Global";
import type { GamepadConfig } from "./Settings";
import type { OperateName } from "./Game/GameMode";
import { UInt32Codec } from "./Utilities/Data/UInt32Codec";
import { PageNotice } from "./Utilities/Feedback/PageNotice";
import { setInteractionEnabled } from "./Utilities/Element/InteractionElement";
import { inputManager } from "./Utilities/Interaction/InputManager";
import { PageInteraction } from "./Utilities/Interaction/PageInteraction";
import { sceneManager } from "./Utilities/SceneManager";
import type { InputInfo, InputObserver } from "./Utilities/Interaction/InputObserver";
import type { MyEvent } from "./Utilities/MyEventListener";

type Action = keyof GamepadConfig;
const actions: Action[] = ["moveLeft", "moveRight", "moveDown", "put", "spinLeft", "spinRight", "unput", "hold", "removeLine", "pause"];
const labels = ["左移動", "右移動", "下移動", "設置", "左回転", "右回転", "一手戻し", "ホールド", "消去", "ポーズ"];
const operationActions: Record<OperateName, Action> = {
    "move-left": "moveLeft", "move-right": "moveRight", "move-down": "moveDown", put: "put",
    "spin-left": "spinLeft", "spin-right": "spinRight", unput: "unput", hold: "hold", removeLine: "removeLine",
};
// 保存形式のキー番号。既存の並びを変更しない。
const codes = [
    ...Array.from({ length: 26 }, (_, i) => `Key${String.fromCharCode(65 + i)}`),
    ...Array.from({ length: 10 }, (_, i) => `Digit${i}`),
    "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space", "Enter", "Backspace",
    "ShiftLeft", "ShiftRight", "Comma", "Period", "Slash", "Semicolon", "Quote", "BracketLeft", "BracketRight", "Backslash", "Minus", "Equal", "Backquote",
    ...Array.from({ length: 10 }, (_, i) => `Numpad${i}`), "NumpadEnter", "NumpadAdd", "NumpadSubtract", "NumpadMultiply", "NumpadDivide", "NumpadDecimal",
];

export function formatKeyboardInput(code: string): string {
    const names: Record<string, string> = { ArrowLeft: "←", ArrowRight: "→", ArrowUp: "↑", ArrowDown: "↓", Space: "Space", Enter: "Enter", Escape: "Esc", Backspace: "Backspace", ShiftLeft: "左Shift", ShiftRight: "右Shift", Comma: ",", Period: ".", Slash: "/", Semicolon: ";", Quote: "'", BracketLeft: "[", BracketRight: "]", Backslash: "\\", Minus: "−", Equal: "=", Backquote: "`" };
    return names[code] ?? code.replace(/^Key|^Digit/, "").replace(/^Numpad/, "テンキー ");
}

/** メニュー・養成所・リプレイの固定キーとは別に、通常プレイの配置だけを保存する。 */
export class KeyboardSettingManager {
    static readonly storageKey = "Pentamond3-keyboardSettings";
    private static custom = this.initial();
    private static useCustom = false;
    private static event: MyEvent | null = null;
    private static opened: Action | null = null;
    private static waiting = false;
    private static waitingSince = 0;

    private static initial(): GamepadConfig {
        return { moveLeft: ["ArrowLeft"], moveRight: ["ArrowRight"], moveDown: ["ArrowDown"], put: ["ArrowUp"], spinLeft: ["KeyC"], spinRight: ["KeyV"], unput: ["KeyB"], hold: ["Space"], removeLine: ["Enter"], pause: ["KeyP"] };
    }

    static getConfig(): GamepadConfig { return structuredClone(this.useCustom ? this.custom : this.initial()); }
    static keysFor(operation: OperateName): string[] { return this.getConfig()[operationActions[operation]]; }
    static get pauseKeys(): string[] { return ["Escape", ...this.getConfig().pause]; }

    static read(): void {
        this.reset(false);
        if (globalValues.nosave) return;
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return;
            if (!raw.startsWith("1:")) throw new Error("未対応のキー配置です");
            const values = UInt32Codec.decode(raw.slice(2), 61);
            if (![0, 1].includes(values[0])) throw new Error("キー配置の選択状態が不正です");
            const config = this.initial();
            const seen = new Set<number>();
            for (let i = 1; i < values.length;) {
                const action = values[i++], count = values[i++];
                if (!actions[action] || seen.has(action) || !Number.isInteger(count) || count < 0 || count > 4 || i + count > values.length) throw new Error("キー配置が不正です");
                seen.add(action);
                config[actions[action]] = values.slice(i, i + count).map((code) => {
                    if (!codes[code]) throw new Error("キーが不正です");
                    return codes[code];
                });
                i += count;
            }
            const all = actions.flatMap((action) => config[action]);
            if (new Set(all).size !== all.length) throw new Error("キーが重複しています");
            this.custom = config;
            this.useCustom = values[0] === 1;
        } catch (error) { console.warn("キーボード設定を読み込めませんでした", error); }
    }

    static reset(removeStorage = true): void {
        if (removeStorage) localStorage.removeItem(this.storageKey);
        this.custom = this.initial();
        this.useCustom = false;
        this.cancel();
        this.render();
    }

    static setup(): void {
        this.close();
        const page = document.getElementById("keyboardSetting")!;
        const grid = page.querySelector<HTMLElement>(".controllerMappingGrid")!;
        grid.replaceChildren();
        actions.forEach((action, index) => {
            const button = document.createElement("div");
            button.className = "button controllerMappingButton";
            button.dataset.keyboardAction = action;
            button.dataset.xy = `[${index % 2},${Math.floor(index / 2) + 1}]`;
            const label = document.createElement("span");
            label.className = "controllerMappingLabel";
            label.textContent = labels[index];
            const value = document.createElement("span");
            value.className = "controllerMappingValue";
            button.append(label, value);
            button.addEventListener("click", () => {
                if (!this.useCustom) { this.status("編集用を選ぶと変更できます。 養成所とメニューは初期配置を使います。"); return; }
                this.opened = action;
                this.renderBindings();
                sceneManager.g$currentPageManager?.openPage("keyboardBindingSetting");
            });
            grid.appendChild(button);
        });
        page.querySelectorAll<HTMLElement>("[data-keyboard-custom]").forEach((button) => button.addEventListener("click", () => {
            this.useCustom = button.dataset.keyboardCustom === "true";
            this.save(); this.render();
        }));
        document.getElementById("keyboardSettingReset")!.addEventListener("click", () => {
            if (!this.useCustom) return;
            this.custom = this.initial(); this.save(); this.render(); this.status("編集用を初期配置へ戻しました。");
        });
        document.getElementById("keyboardBindingAdd")!.addEventListener("click", () => {
            if (!this.opened || this.custom[this.opened].length >= 4) return;
            this.waiting = true;
            this.waitingSince = Date.now();
            PageInteraction.inputBlocked = true;
            document.getElementById("keyboardBindingStatus")!.textContent = "追加するキーを押してください。 Escで取り消せます。";
            document.getElementById("keyboardBindingAdd")!.classList.add("waitingInput");
        });
        this.event = inputManager.addHandler("inputValid", ([input, info]: [InputObserver, InputInfo]) => {
            if (!this.waiting || input.g$type !== "keyboard" || info.time <= this.waitingSince) return;
            info.consumed = true;
            if (info.name === "Escape") { this.cancel(); return; }
            if (!codes.includes(info.name) || input.g$validInputNames.some((code) => /^(Control|Alt|Meta)/.test(code))) {
                document.getElementById("keyboardBindingStatus")!.textContent = "文字・数字・矢印・Spaceなどの単独キーを押してください。 Escで取り消せます。";
                return;
            }
            const action = this.opened!;
            actions.forEach((other) => this.custom[other] = this.custom[other].filter((code) => code !== info.name));
            this.custom[action].push(info.name);
            this.cancel(); this.save(); this.render(); this.renderBindings();
            PageInteraction.updateLastOperateTime();
            document.getElementById("keyboardBindingStatus")!.textContent = `${formatKeyboardInput(info.name)}を追加しました。`;
        });
        sceneManager.g$currentPageManager?.addHandler("changePage", (id: string) => {
            if (id !== "keyboardBindingSetting") this.cancel();
            if (id === "keyboardSetting" || id === "howToOperate") this.render();
        });
        sceneManager.g$currentPageManager?.addHandler("settingsReset", () => this.render());
        this.render();
    }

    static close(): void { if (this.event) inputManager.removeEvent(this.event); this.event = null; this.cancel(); }
    private static cancel(): void {
        const wasWaiting = this.waiting;
        this.waiting = false;
        if (wasWaiting) { PageInteraction.inputBlocked = false; PageInteraction.updateLastOperateTime(); }
        document.getElementById("keyboardBindingAdd")?.classList.remove("waitingInput");
        const status = document.getElementById("keyboardBindingStatus");
        if (status) status.textContent = "削除するキーを選ぶか、 新しい入力を追加してください。 Escは常にポーズに使えます。";
    }
    private static status(text: string): void { const status = document.getElementById("keyboardSettingStatus"); if (status) status.textContent = text; }
    private static render(): void {
        const config = this.getConfig();
        document.querySelectorAll<HTMLElement>("[data-keyboard-custom]").forEach((button) => {
            const selected = (button.dataset.keyboardCustom === "true") === this.useCustom;
            button.classList.toggle("selectedValue", selected);
            button.setAttribute("aria-pressed", String(selected));
        });
        this.status(this.useCustom ? "操作を選んでキーを変更できます。 1操作につき4つまで。 変更は自動で保存されます。" : "編集用を選ぶと変更できます。 メニューと養成所は初期配置を使います。");
        document.querySelectorAll<HTMLElement>("[data-keyboard-action]").forEach((button) => {
            const action = button.dataset.keyboardAction as Action;
            const value = button.querySelector<HTMLElement>(".controllerMappingValue")!;
            value.replaceChildren();
            (action === "pause" ? ["Escape", ...config[action]] : config[action].length ? config[action] : [""]).forEach((code) => {
                const span = document.createElement("span"); span.className = "controllerMappingInput";
                span.textContent = code ? formatKeyboardInput(code) : "登録なし"; value.appendChild(span);
            });
        });
        const reset = document.getElementById("keyboardSettingReset");
        if (reset) setInteractionEnabled(reset, this.useCustom);
        document.querySelectorAll<HTMLElement>("[data-keyboard-help]").forEach((value) => {
            const action = value.dataset.keyboardHelp as Action;
            value.textContent = (action === "pause" ? ["Escape", ...config.pause] : config[action]).map(formatKeyboardInput).join(" / ") || "登録なし";
        });
    }
    private static renderBindings(): void {
        if (!this.opened) return;
        document.getElementById("keyboardBindingTitle")!.textContent = `${labels[actions.indexOf(this.opened)]}の割り当て`;
        const list = document.getElementById("keyboardBindingList")!;
        list.replaceChildren();
        const keys = this.custom[this.opened];
        keys.forEach((code, i) => {
            const button = document.createElement("div"); button.className = "button controllerBindingDelete";
            button.dataset.xy = `[0,${i}]`; button.textContent = `${formatKeyboardInput(code)} を削除`;
            button.addEventListener("click", () => { this.custom[this.opened!] = keys.filter((key) => key !== code); this.save(); this.render(); this.renderBindings(); });
            list.appendChild(button);
        });
        if (!keys.length) { const text = document.createElement("div"); text.className = "text"; text.textContent = "登録なし"; list.appendChild(text); }
        const add = document.getElementById("keyboardBindingAdd")!;
        add.dataset.xy = `[0,${keys.length}]`; setInteractionEnabled(add, keys.length < 4);
        document.querySelector<HTMLElement>("#keyboardBindingSetting .back")!.dataset.xy = `[0,${keys.length + 1}]`;
    }
    private static save(): void {
        if (globalValues.nosave) return;
        const initial = this.initial();
        const values = [Number(this.useCustom)];
        actions.forEach((action, i) => { if (JSON.stringify(this.custom[action]) !== JSON.stringify(initial[action])) values.push(i, this.custom[action].length, ...this.custom[action].map((code) => codes.indexOf(code))); });
        try { localStorage.setItem(this.storageKey, "1:" + UInt32Codec.encode(values)); }
        catch { PageNotice.notify("キーボード設定を保存できませんでした。 今回の起動中は反映されますが、 再読み込みすると失われます。"); }
    }
}
