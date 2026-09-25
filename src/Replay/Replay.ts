import { BlockKind } from "../BlockOperate/Block";
import { AutoInputData } from "../Utilities/Interaction/AutoInputObserver";
import * as Setting from "../Settings";
import { GamePlayer } from "../Game/GamePlayer";
import { GameMode } from "../Game/GameMode";

import { ReplayDom } from "./ReplayDom";
import { ReplayDataHandler } from "./ReplayDataHandler";
import { ReplayEventSetter } from "./ReplayEventSetter";
import { PlaySetting } from "../BeforePlaying/PlaySettingSetter";
import { qsAll } from "../Utils";
import { sceneManager } from "../Utilities/SceneManager";

//リプレイ
export type ReplayData = {
    inputData: AutoInputData[][];
    nextData: BlockKind[][];
    playSetting: PlaySetting;
    finishTime: number;
    finishPlayers: number[];
    nuisanceBlockData: number[][];
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

    static addTempData({ players, game, playSetting }: { players: GamePlayer[]; game: GameMode; playSetting: PlaySetting }) {
        const replayData = ReplayDataHandler.createReplayData(players, game, playSetting);

        ReplayDataHandler.addTempData(replayData, Setting.maximumTemporaryReplaySavable);

        //後で修正
        // const buttons = ReplayDom.createTempReplayButton(replayData.date);
        // ReplayEventSetter.setTempReplayPageEvent(ReplayDataHandler.tempDataList, buttons);
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
