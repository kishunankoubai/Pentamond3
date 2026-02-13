import { EventId, EventManager, MyEventListener } from "../UtilManagers/EventManager";
import { inputManager } from "../Interaction/InputManager";
import { pageManager } from "../UtilManagers/PageManager";
import { sleep, qs } from "../Utils";
import * as Setting from "../Settings";
import { GameProcessing } from "../GameProcessing/GameProcessing";
import { ScreenInteractionView } from "./ScreenInteractionView";
import { ScreenInteractionInputHandler } from "./ScreenInteractionInputHandler";
import { ScreenInteractionOperationRunner } from "./ScreenInteractionOperationRunner";

export type MappedElement = {
    element: HTMLElement;
    coordinate: [number, number];
};

//画面のinputによる操作
class ScreenInteraction implements MyEventListener {
    private static instance: ScreenInteraction;

    private operable: boolean = true;

    private readonly view = new ScreenInteractionView();
    private readonly inputHandler = new ScreenInteractionInputHandler();
    private readonly operationRunner = new ScreenInteractionOperationRunner(this.view);

    /**
     * @param interaction-ページ名 すべての操作
     * @param confirmInteraction-ページ名 決定などの操作　いわゆる〇ボタン
     * @param cancelInteraction-ページ名 キャンセルなどの操作  いわゆる×ボタン
     */
    readonly eventClassNames: string[] = ["interaction", "confirmInteraction", "cancelInteraction"];
    addEvent(classNames: string[], handler: Function): EventId {
        return EventManager.addEvent({ classNames, handler });
    }

    constructor() {
        if (ScreenInteraction.instance) {
            return ScreenInteraction.instance;
        }

        ScreenInteraction.instance = this;

        this.setEvents();
    }

    setHoverHighlight(button: HTMLElement) {
        this.view.setHoverHighlight(button);
    }

    areOperated(interactions: string[]) {
        return this.inputHandler.areOperated(interactions);
    }

    updateLastOperationTime() {
        this.operationRunner.updateLastOperationTimeAndHidePointer();
    }

    set s$operable(operable: boolean) {
        this.operable = operable;
    }

    /**
     * 次のページ変更時に何かをあらかじめfocusするか
     */
    set s$focusFlag(focusFlag: boolean) {
        this.view.focusOnPageChange = focusFlag;
    }

    get g$lastOperateTime() {
        return this.operationRunner.getLastOperationTime();
    }

    get g$selectedElement(): MappedElement | null {
        return this.view.getFocusedElement();
    }

    private hasSet = false;
    private setEvents() {
        if (this.hasSet) throw new Error("既にsetされている!");
        this.hasSet = true;

        // ページ変更ごとにそのページを操作できるイベントをinputに追加する
        pageManager.addEvent(["pageChanged"], () => {
            this.updatePageOperateEvent();
        });

        this.operationRunner.setEvents();
        this.view.setupMouseFocusing();
        this.view.setupRangeFocusing();

        this.inputHandler.onOperate = (pushedKey) => {
            this.onOperate(pushedKey);
        };
        this.inputHandler.setEvents();
    }

    private async updatePageOperateEvent() {
        // ページが開かれていなかったらリターン
        const pageId = pageManager.g$currentPageId;
        if (!pageId) return;

        // フォーカスを新しいページに移動
        this.view.shiftFocusTo(pageId);

        // イベントを削除
        this.inputHandler.removeInput();

        //早すぎるページ遷移の禁止
        await sleep(Setting.debounceOperateTime * 2.5);

        // イベントの追加
        this.inputHandler.registerNonAutoInputs();

        // mappingが設定されたElementを更新
        this.view.updateMappedElementList(pageId);
    }

    private onOperate(latestKey: string) {
        if (!this.operable) return;

        this.operationRunner.run(latestKey);
    }
}

export const screenInteraction = new ScreenInteraction();
