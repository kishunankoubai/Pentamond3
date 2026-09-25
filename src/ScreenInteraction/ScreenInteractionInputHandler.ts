import { EventId, EventManager } from "../UtilManagers/EventManager";
import { Input } from "../Interaction/Input";
import { inputManager } from "../Interaction/InputManager";

export class ScreenInteractionInputHandler {
    private registeredInputList: Input[] = [];
    private pageOperateEvents: EventId[] = [];

    /**
     * 登録されたinputが何かしらの操作を行ったとき呼ばれる
     * @param pushedKey
     */
    onOperate = (pushedKey: string) => {};

    /**
     * 途中追加されたinputを登録するイベント
     */
    setEvents() {
        inputManager.addEvent(["inputAdded"], () => {
            const addedInput = inputManager.g$inputs.at(-1)!;

            if (addedInput.isAuto()) return;

            this.registerInput(addedInput);
        });
    }

    areOperated(interactions: string[]) {
        return this.registeredInputList.some((input) => interactions.includes(input.g$manager.g$latestPressingKey));
    }

    removeInput() {
        EventManager.removeEvents(this.pageOperateEvents);
        this.pageOperateEvents = [];
        this.registeredInputList = [];
    }

    /**
     * AutoではないInputを登録する
     */
    registerNonAutoInputs() {
        inputManager.g$inputs.forEach((input) => {
            if (input.isAuto()) return;
            this.registerInput(input);
        });
    }

    /**
     * 指定したページを操作するEventを指定したinputに追加する
     * @param pageId ページのid
     * @param input Eventを追加するinput
     */
    private registerInput(input: Input): void {
        // すでに登録されているならリターン
        if (this.registeredInputList.includes(input)) return;
        this.registeredInputList.push(input);

        const manager = input.g$manager;

        const operationEvents = ["onKeydown", "onButtondown", "onStickActive"];

        const eventId = manager.addEvent(operationEvents, () => this.onOperate(manager.g$latestPressingKey));

        this.pageOperateEvents.push(eventId);
    }
}
