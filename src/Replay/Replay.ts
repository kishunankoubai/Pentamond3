import { BlockKind } from "../BlockOperate/Block";
import { AutoKeyboardInputData } from "../Interaction/AutoKeyboardManager";
import * as Setting from "../Settings";
import { GamePlayer } from "../Game/GamePlayer";
import { GameMode } from "../Game/GameMode";

import { ReplayDom } from "./ReplayDom";
import { ReplayDataHandler } from "./ReplayDataHandler";
import { pageManager } from "../UtilManagers/PageManager";
import { ReplayEventSetter } from "./ReplayEventSetter";
import { PlaySetting } from "../BeforePlaying/PlaySettingSetter";
import { qsAll } from "../Utils";
import { GameProcessing } from "../GameProcessing/GameProcessing";
import { screenInteraction } from "../ScreenInteraction/ScreenInteraction";

//リプレイ
export type ReplayData = {
    inputData: AutoKeyboardInputData[][];
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

        const buttons = ReplayDom.createTempReplayButton(replayData.date);
        ReplayEventSetter.setTempReplayPageEvent(ReplayDataHandler.tempDataList, buttons);
    }

    static save(replayData: ReplayData) {
        return ReplayDataHandler.saveReplayData(replayData, {
            onOverMax: () => {
                pageManager.setPage("replaySaveAlert");
            },
            onError: () => {
                pageManager.setPage("replaySaveAlert2");
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

    static setEvents() {
        screenInteraction.addEvent(["interaction"], () => {
            // 今play画面か?
            const currentPageId = pageManager.g$currentPageId;
            if (currentPageId !== "play") return;

            // ポーズボタンが押されたか?
            const pauseInteractions = ["KeyP", ...Setting.gamepadConfigPresets[0].pause];
            const requiredPause = screenInteraction.areOperated(pauseInteractions);
            if (!requiredPause) return;

            this.pauseReplay();
        });
    }

    private static pauseReplay() {
        const currentGame = GameProcessing.currentGame;
        if (!currentGame) throw new Error("ゲームが始められていないのにポーズされた。");

        if (GameProcessing.isReplaying() && currentGame.g$isPlaying) {
            currentGame.game.stop();
            screenInteraction.s$focusFlag = true;
            screenInteraction.updateLastOperationTime();
            pageManager.setPage("replayPause");
        }
    }
}
