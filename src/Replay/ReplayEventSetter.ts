import { GameProcessing } from "../GameProcessing/GameProcessing";
import { qsAll, qs } from "../Utils";
import { ReplayData, Replay } from "./Replay";
import { ReplayDataHandler } from "./ReplayDataHandler";
import { ElementManager } from "../Utilities/Element/ElementManager";
import { sceneManager } from "../Utilities/SceneManager";
import { setInteractionEnabled } from "../Utilities/Element/InteractionElement";

export class ReplayEventSetter {
    static setTempReplayPageEvent(tempDataList: ReplayData[], { replayButton, saveButton }: { replayButton: HTMLElement; saveButton: HTMLElement }) {
        replayButton.addEventListener("click", () => {
            const replayButtons = qsAll("#replay .replayButton");
            const index = replayButtons.findIndex((button) => button == replayButton);
            const data = index >= 0 ? tempDataList.at(-index - 1) : undefined;
            if (data) GameProcessing.startReplay(data);
        });
        replayButton.addEventListener("focus", () => {
            ElementManager.scrollToCenter(replayButton.parentElement!);
        });

        saveButton.addEventListener("click", async () => {
            if (saveButton.getAttribute("aria-disabled") === "true") return;
            const saveButtons = qsAll("#replay .replaySaveButton");
            const index = saveButtons.findIndex((button) => button == saveButton);

            const data = index >= 0 ? tempDataList.at(-index - 1) : undefined;
            if (!data) return;
            setInteractionEnabled(saveButton, false);
            try {
                const succeed = await Replay.save(data);
                if (succeed) saveButton.classList.add("replaySavedButton");
            } finally {
                setInteractionEnabled(saveButton, !saveButton.classList.contains("replaySavedButton"));
            }
        });
        saveButton.addEventListener("focus", async () => {
            ElementManager.scrollToCenter(saveButton.parentElement!);
        });
    }

    static setSavedReplayPageEvent(replayDataList: ReplayData[], { replayButtons, deleteButtons }: { replayButtons: HTMLElement[]; deleteButtons: HTMLElement[] }) {
        replayButtons.forEach((replayButton, i) => {
            replayButton.addEventListener("click", () => {
                GameProcessing.startReplay(replayDataList[i]);
            });
            replayButton.addEventListener("focus", () => {
                ElementManager.scrollToCenter(replayButton.parentElement!);
            });
        });

        deleteButtons.forEach((deleteButton, i) => {
            deleteButton.addEventListener("click", () => {
                this.onClickDeleteButton(replayDataList[i]);
            });
            deleteButton.addEventListener("focus", () => {
                ElementManager.scrollToCenter(deleteButton.parentElement!);
            });
        });
    }

    private static async onClickDeleteButton(replayData: ReplayData) {
        const scene = sceneManager.g$currentScene;
        const approved = await this.checkApprove();
        if (!approved || scene !== sceneManager.g$currentScene) return;
        const pageManager = sceneManager.g$currentPageManager;
        if (!pageManager) return;

        try {
            await ReplayDataHandler.removeSavedReplayData(replayData);
            Replay.updateTempReplaySaveButton();
            await Replay.setupSavedReplayPage();
            await pageManager.backPage(1);
        } catch (error) {
            console.warn("リプレイを削除できませんでした", error);
            qs("#replayDeleteAlert .text").textContent = "削除できませんでした。戻ってから再度お試しください。";
        }
    }

    private static checkApprove() {
        const scene = sceneManager.g$currentScene;
        if (!scene) return Promise.resolve(false);
        const pageManager = scene.g$pageManager;
        const confirmButton = qs("#replayDeleteConfirmButton");
        setInteractionEnabled(confirmButton, false);
        confirmButton.style.display = "none";
        pageManager.openPage("replayDeleteAlert");
        return new Promise<boolean>((resolve) => {
            const ac = new AbortController();
            const complete = (approved: boolean) => {
                clearTimeout(timer);
                ac.abort();
                pageManager.removeEvent(changeEvent);
                scene.removeEvent(endEvent);
                setInteractionEnabled(confirmButton, false);
                resolve(approved);
            };
            const changeEvent = pageManager.addHandler("changePage", (pageId: string) => {
                if (pageId !== "replayDeleteAlert") complete(false);
            });
            const endEvent = scene.addHandler("sceneEnd", () => complete(false));
            const timer = setTimeout(() => {
                if (pageManager.g$currentPageId !== "replayDeleteAlert") return;
                confirmButton.style.removeProperty("display");
                setInteractionEnabled(confirmButton, true);
            }, 1500);
            confirmButton.addEventListener(
                "click",
                () => {
                    if (confirmButton.getAttribute("aria-disabled") !== "true") complete(true);
                },
                { signal: ac.signal }
            );

        });
    }
}
