import { AutoInputData } from "../Utilities/Interaction/AutoInputObserver";
import * as Setting from "../Settings";

import { ReplayDom } from "./ReplayDom";
import { ReplayDataHandler } from "./ReplayDataHandler";
import { ReplayEventSetter } from "./ReplayEventSetter";
import { PlaySetting } from "../BeforePlaying/PlaySettingSetter";
import { qsAll } from "../Utils";
import { sceneManager } from "../Utilities/SceneManager";
import type { DisposableGame } from "../GameProcessing/DisposableGame";
import { setInteractionEnabled } from "../Utilities/Element/InteractionElement";

//リプレイ
export type ReplayRandomSeeds = {
    next: number[];
    nuisance: number[];
};

export type ReplayData = {
    inputData: AutoInputData[][];
    playSetting: PlaySetting;
    finishTime: number;
    finishPlayers: number[];
    randomSeeds: ReplayRandomSeeds;
    version: 2;
    date: number;
};

/**
 * replay関係のインターフェース
 * これ以外は触ってはいけない
 * 親から子へ命令を送る
 * 子が親または兄弟の情報を使うべきではない
 *
 * まだそれは為されていない
 *
 * model: DataHandler
 * view: Dom
 * controller: Replay, EventSetter
 */
export class Replay {
    private static renderedSavedPages = new WeakMap<Element, string>();
    static async deleteAllData(): Promise<void> {
        localStorage.removeItem(ReplayDataHandler.storageKey);
        ReplayDataHandler.tempDataList.length = 0;
        this.setupTempReplayPage();
        await this.setupSavedReplayPage();
    }

    static getDataSize() {
        return ReplayDataHandler.getDataSize();
    }

    static async setupSavedReplayPage() {
        const container = document.querySelector("#savedReplay .options");
        if (!container) return;
        const replayDataList = ReplayDataHandler.getReplayDataList();
        const signature = JSON.stringify(replayDataList.map((data) => data.date));
        if (this.renderedSavedPages.get(container) === signature) return;

        // Dom
        const buttons = ReplayDom.setupSavedReplayPage(replayDataList);

        // Event
        ReplayEventSetter.setSavedReplayPageEvent(replayDataList, buttons);
        this.renderedSavedPages.set(container, signature);
    }

    static setupTempReplayPage() {
        if (!document.querySelector("#replay .options")) return;
        const buttons = ReplayDom.setupTempReplayPage(ReplayDataHandler.tempDataList);
        buttons.forEach(({ replayButton, saveButton }) => ReplayEventSetter.setTempReplayPageEvent(ReplayDataHandler.tempDataList, { replayButton, saveButton }));
        this.updateTempReplaySaveButton();
    }

    static addTempData(disposableGame: DisposableGame) {
        const replayData = ReplayDataHandler.createReplayData(disposableGame);

        ReplayDataHandler.addTempData(replayData, Setting.maximumTemporaryReplaySavable);
    }

    static save(replayData: ReplayData) {
        const pageManager = sceneManager.g$currentPageManager;
        if (!pageManager) throw Error("sceneが設定されていません");

        return ReplayDataHandler.saveReplayData(replayData, {
            onOverMax: () => {
                pageManager.openPage("replaySaveAlert");
            },
            onError: () => {
                pageManager.openPage("replaySaveAlert2");
            },
        });
    }

    static updateTempReplaySaveButton() {
        const dateList = ReplayDataHandler.getDateList();
        const saveButtons = qsAll("#replay .replaySaveButton");

        saveButtons.forEach((saveButton) => {
            const index = saveButtons.findIndex((button) => button == saveButton);
            const replayData = ReplayDataHandler.tempDataList.at(-index - 1)!;
            saveButton.classList.toggle("replaySavedButton", dateList.includes(replayData.date));
            setInteractionEnabled(saveButton, !dateList.includes(replayData.date));
        });
    }

    static saveLastOne() {
        const data = ReplayDataHandler.tempDataList.at(-1);
        return data ? this.save(data) : Promise.resolve(false);
    }
}
