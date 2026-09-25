import { GameProcessing } from "../GameProcessing/GameProcessing";
import { qsAll, qs, sleep } from "../Utils";
import { ReplayData, Replay } from "./Replay";
import { ReplayDataHandler } from "./ReplayDataHandler";
import { MusicManager } from "../Utilities/Music/MusicManager";
import { ElementManager } from "../Utilities/Element/ElementManager";
import { sceneManager } from "../Utilities/SceneManager";

export class ReplayEventSetter {
    static setTempReplayPageEvent(tempDataList: ReplayData[], { replayButton, saveButton }: { replayButton: HTMLButtonElement; saveButton: HTMLButtonElement }) {
        replayButton.addEventListener("click", () => {
            const replayButtons = qsAll("#replay .replayButton");
            const index = replayButtons.findIndex((button) => button == replayButton);
            MusicManager.get("ボタン")?.play();
            GameProcessing.startReplay(tempDataList.at(-index - 1)!);
        });
        replayButton.addEventListener("focus", () => {
            MusicManager.get("フォーカス")?.play();
            ElementManager.scrollToCenter(replayButton.parentElement!);
        });

        saveButton.addEventListener("click", async () => {
            const saveButtons = qsAll("#replay .replaySaveButton");
            const index = saveButtons.findIndex((button) => button == saveButton);

            const succeed = await Replay.save(tempDataList.at(-index - 1)!);
            if (succeed) {
                MusicManager.get("ボタン")?.play();
                Replay.setupSavedReplayPage();
                saveButton.classList.add("replaySavedButton");
            }
        });
        saveButton.addEventListener("focus", async () => {
            MusicManager.get("フォーカス")?.play();
            ElementManager.scrollToCenter(saveButton.parentElement!);
        });
    }

    static setSavedReplayPageEvent(replayDataList: ReplayData[], { replayButtons, deleteButtons }: { replayButtons: HTMLButtonElement[]; deleteButtons: HTMLButtonElement[] }) {
        replayButtons.forEach((replayButton, i) => {
            replayButton.addEventListener("click", () => {
                MusicManager.get("ボタン")?.play();
                GameProcessing.startReplay(replayDataList[i]);
            });
            replayButton.addEventListener("focus", () => {
                MusicManager.get("フォーカス")?.play();
                ElementManager.scrollToCenter(replayButton.parentElement!);
            });
        });

        deleteButtons.forEach((deleteButton, i) => {
            deleteButton.addEventListener("click", () => {
                this.onClickDeleteButton(replayDataList[i]);
                MusicManager.get("ボタン")?.play();
            });
            deleteButton.addEventListener("focus", () => {
                MusicManager.get("フォーカス")?.play();
                ElementManager.scrollToCenter(deleteButton.parentElement!);
            });
        });
    }

    private static async onClickDeleteButton(replayData: ReplayData) {
        const approved = await this.checkApprove();
        if (!approved) return;
        const pageManager = sceneManager.g$currentPageManager;
        if (!pageManager) return;

        const index = ReplayDataHandler.tempDataList.findIndex((data) => data.date == replayData.date);
        qsAll(".replaySaveButton")[ReplayDataHandler.tempDataList.length - index - 1]?.classList.remove("replaySavedButton");

        // lastOperateTime = Date.now();
        await ReplayDataHandler.removeSavedReplayData(replayData);

        pageManager.backPage(2, true);

        await Replay.setupSavedReplayPage();

        pageManager.openPage("savedReplay");
    }

    private static checkApprove() {
        let pageManager = sceneManager.g$currentPageManager;
        if (!pageManager) throw Error("sceneが設定されていません");

        pageManager.openPage("replayDeleteAlert");

        const confirmButton = qs("#replayDeleteConfirmButton") as HTMLButtonElement;
        confirmButton.disabled = true;
        confirmButton.style.opacity = "0";

        const back = qs("#replayDeleteAlert .back") as HTMLButtonElement;

        // 承認は1.5秒経たないとできない
        sleep(1500).then(() => {
            confirmButton.disabled = false;
            confirmButton.style.opacity = "1";
        });

        return new Promise<boolean>((resolve) => {
            const ac = new AbortController();

            confirmButton.addEventListener(
                "click",
                () => {
                    resolve(true);
                    ac.abort();
                },
                { signal: ac.signal }
            );

            back.addEventListener(
                "click",
                () => {
                    resolve(false);
                    ac.abort();
                },
                { signal: ac.signal }
            );
        });
    }
}
