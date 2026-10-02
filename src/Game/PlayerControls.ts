import { ControllerRegisterer } from "../BeforePlaying/ControllerRegisterer";
import * as Setting from "../Settings";
import { EventScope } from "../Utilities/EventScope";
import type { GamePlayer } from "./GamePlayer";
import type { OperateName } from "./GameMode";
import { operationKeyCodes } from "./Operations";
import type { InputInfo } from "../Utilities/Interaction/InputObserver";

/** モードによらない操作・押しっぱなし処理。入力の観測はUtilitiesに任せる。 */
export function bindPlayerControls(player: GamePlayer, playerIndex: number, events: EventScope): void {
    const config = ControllerRegisterer.gamepadConfigs[playerIndex] ?? Setting.gamepadConfigPresets[0];
    const input = player.input;
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
    const operate = (name: string) => {
        const binding = bindings.find(([operation, action]) => name === operationKeyCodes[operation] || config[action].includes(name));
        if (!binding) return;
        binding[2]();
        player.updateCanvas();
    };
    let previousKey = "";
    let lastRepeatTime = 0;
    const moveKeys = ["ArrowLeft", "ArrowRight", "ArrowDown", ...config.moveLeft, ...config.moveRight, ...config.moveDown];
    events.add(
        input.addHandler("inputValid", (info: InputInfo) => {
            if (info.consumed) { suppressedInputs.add(info.name); return; }
            if (!player.loop.g$isStopping) operate(input.g$latestPressingKey);
        }),
        input.addHandler("inputInvalid", (info: InputInfo) => suppressedInputs.delete(info.name)),
        player.loop.addHandler("loop", () => {
            const key = input.getLatestPressingKey(moveKeys.filter((key) => !suppressedInputs.has(key)));
            if (key !== previousKey) lastRepeatTime = 0;
            previousKey = key;
            const pressTime = Date.now() - input.getPressTime(key);
            if (key && pressTime >= Setting.input.delayTime) {
                if (pressTime - lastRepeatTime >= Setting.input.repeatTime) {
                    operate(key);
                    lastRepeatTime = pressTime;
                }
            } else lastRepeatTime = 0;
        })
    );
}
