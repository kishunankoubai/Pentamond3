import { ControllerRegisterer } from "../BeforePlaying/ControllerRegisterer";
import * as Setting from "../Config/GameConfig";
import { EventScope } from "../Utilities/Event/EventScope";
import type { GamePlayer } from "./GamePlayer";
import type { OperateName } from "./GameMode";
import { operationKeyCodes } from "./Operations";
import type { InputInfo } from "../Utilities/Interaction/InputObserver";
import { KeyboardSettingManager } from "../Input/KeyboardSettingManager";

/** モードによらない操作・押しっぱなし処理。入力の観測はUtilitiesに任せる。 */
export function bindPlayerControls(player: GamePlayer, playerIndex: number, events: EventScope): void {
    const input = player.input;
    const config = input.g$type === "keyboard"
        ? ControllerRegisterer.keyboardConfigs[playerIndex] ?? KeyboardSettingManager.getConfig()
        : ControllerRegisterer.gamepadConfigs[playerIndex] ?? Setting.gamepadConfigPresets[0];
    const suppressedInputs = new Set(input.g$validInputNames.filter((name) => input.getLatest(name)?.consumed));
    const bindings: [OperateName, keyof Setting.GamepadConfig, () => void][] = [
        ["move-left", "moveLeft", () => player.operator.move("left")],
        ["move-right", "moveRight", () => player.operator.move("right")],
        ["move-down", "moveDown", () => player.operator.move("down")],
        ["put", "put", () => player.operator.put()],
        ["spin-left", "spinLeft", () => player.operator.spin("left")],
        ["spin-right", "spinRight", () => player.operator.spin("right")],
        ["unput", "unput", () => player.operator.unput()],
        ["hold", "hold", () => player.operator.hold()],
        ["removeLine", "removeLine", () => player.operator.removeLine()],
    ];
    // リプレイは配置とは無関係の操作名から変換された固定キーで再生する。
    const keysFor = (operation: OperateName, action: keyof Setting.GamepadConfig) => input.g$type === "autoKeyboard" ? [operationKeyCodes[operation]] : config[action];
    const operate = (name: string) => {
        player.clock.synchronize();
        if (player.loop.g$isStopping) return;
        const binding = bindings.find(([operation, action]) => keysFor(operation, action).includes(name));
        if (!binding) return;
        binding[2]();
        player.updateCanvas();
    };
    let previousKey = "";
    let lastRepeatTime = 0;
    const moveKeys = bindings.filter(([operation]) => operation.startsWith("move-")).flatMap(([operation, action]) => keysFor(operation, action));
    events.add(
        input.addHandler("inputValid", (info: InputInfo) => {
            if (info.consumed) { suppressedInputs.add(info.name); return; }
            if (!player.loop.g$isStopping) operate(input.g$latestPressingKey);
        }),
        input.addHandler("inputInvalid", (info: InputInfo) => suppressedInputs.delete(info.name)),
        player.loop.addHandler("loop", () => {
            // リプレイは記録済みのリピートも再生するので、追加生成しない。
            if (input.g$type === "autoKeyboard") return;
            const key = input.getLatestPressingKey(moveKeys.filter((key) => !suppressedInputs.has(key)));
            if (key !== previousKey) lastRepeatTime = 0;
            previousKey = key;
            const pressTime = Date.now() - input.getPressTime(key);
            if (key && pressTime >= Setting.input.delayTime) {
                if (pressTime - lastRepeatTime >= Setting.input.repeatTime) {
                    player.clock.schedule(player.clock.g$now, () => operate(key), 1);
                    lastRepeatTime = pressTime;
                }
            } else lastRepeatTime = 0;
        })
    );
}
