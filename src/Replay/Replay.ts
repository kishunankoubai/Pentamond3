import { BlockKind } from "../BlockOperate/Block";
import { AutoInputData } from "../Utilities/Interaction/AutoInputObserver";
import * as Setting from "../Settings";

import { ReplayDom } from "./ReplayDom";
import { ReplayDataHandler } from "./ReplayDataHandler";
import { ReplayEventSetter } from "./ReplayEventSetter";
import { PlaySetting } from "../BeforePlaying/PlaySettingSetter";
import { qsAll } from "../Utils";
import { sceneManager } from "../Utilities/SceneManager";
import type { DisposableGame } from "../GameProcessing/DisposableGame";

//リプレイ
export type ReplayRandomSeeds = {
    next: number[];
    nuisance: number[];
};

export type ReplayData = {
    inputData: AutoInputData[][];
    /** version 1のリプレイとの後方互換用。version 2以降はseedを使用する。 */
    nextData?: BlockKind[][];
    playSetting: PlaySetting;
    finishTime: number;
    finishPlayers: number[];
    /** version 1のリプレイとの後方互換用。version 2以降はseedを使用する。 */
    nuisanceBlockData?: number[][];
    randomSeeds?: ReplayRandomSeeds;
    version?: 2;
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
    static getDataSize() {
        return ReplayDataHandler.getDataSize();
    }

    static async setupSavedReplayPage() {
        const replayDataList = await ReplayDataHandler.getReplayDataList();

        // Dom
        const buttons = ReplayDom.setupSavedReplayPage(replayDataList);

        // Event
        ReplayEventSetter.setSavedReplayPageEvent(replayDataList, buttons);
    }

    static setupTempReplayPage() {
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
            if (dateList.includes(replayData.date)) {
                saveButton.classList.add("replaySavedButton");
            }
        });
    }

    static saveLastOne() {
        return this.save(ReplayDataHandler.tempDataList.at(-1)!);
    }
}
