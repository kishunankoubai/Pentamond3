import { ElementManager } from "../Utilities/Element/ElementManager";
import { qs, qsAll } from "../Utils";
import { ReplayData } from "./Replay";

export class ReplayDom {
    private static readonly parser = new DOMParser();

    static setupSavedReplayPage(replayDataList: ReplayData[]) {
        const container = qs("#savedReplay .options");
        container.querySelectorAll(".replayDataContainer").forEach((element) => {
            element.remove();
        });

        const replayButtons: HTMLButtonElement[] = [];
        const deleteButtons: HTMLButtonElement[] = [];

        for (const replayData of replayDataList) {
            const { replayDataContainer, replayButton, deleteButton } = this.createReplayDataContainer(replayData);

            container.prepend(replayDataContainer);

            replayButtons.push(replayButton);
            deleteButtons.push(deleteButton);
        }

        container.querySelectorAll("button").forEach((button) => {
            ElementManager.scrollToCenter(button);
        });

        //座標の割り振り
        qsAll("#savedReplay .replayButton").forEach((button, i) => {
            button.dataset.mapping = `[0,${i}]`;
        });

        qsAll("#savedReplay .replayDeleteButton").forEach((button, i) => {
            button.dataset.mapping = `[1,${i}]`;
        });

        qs("#savedReplay .back").dataset.mapping = `[0,${replayDataList.length}]`;

        return { deleteButtons, replayButtons };
    }

    private static createReplayDataContainer(replayData: ReplayData) {
        const now = new Date(replayData.date);

        const html = `
            <div class="replayDataContainer">
                <button class="replayButton">${this.getDateString(now)}</button>
                <div class="replayDataDescription">${this.createReplayDataDescription(replayData)}</div>
                <button class="replayDeleteButton"></button>
            </div>
        `;

        const replayDataContainer = this.parser.parseFromString(html, "text/html").body.firstElementChild!;

        const replayButton = replayDataContainer.querySelector(".replayButton") as HTMLButtonElement;
        const deleteButton = replayDataContainer.querySelector(".replayDeleteButton") as HTMLButtonElement;

        return { replayButton, deleteButton, replayDataContainer };
    }

    private static getDateString(now: Date) {
        const hour = `${now.getHours()}`;
        const month = `${now.getMonth() + 1}`;

        return `
            ${now.getFullYear()}/${month.length === 1 ? "0" + month : month}/${now.getDate()}
            ${hour.length === 1 ? "&nbsp;&nbsp;&nbsp;" + hour : hour} :
            ${now.getMinutes() < 10 ? "0" + now.getMinutes() : now.getMinutes()} :
            ${now.getSeconds() < 10 ? "0" + now.getSeconds() : now.getSeconds()}
        `;
    }

    private static createReplayDataDescription(replayData: ReplayData) {
        const solo = replayData.nextData.length == 1 ? "ソロ" : "マルチ";
        const mode = this.stringifyMode(replayData.playSetting.mode);
        const time = (replayData.finishTime / 1000).toFixed(2);

        return `${solo} : ${mode}<br>時間: ${time}`;
    }

    private static stringifyMode(mode: number) {
        switch (mode) {
            case 1:
                return "サバイバル";
            case 2:
                return "十五列揃え";
            default:
                return "不明なモード";
        }
    }

    static createTempReplayButton(date: number) {
        const now = new Date(date);

        const replayButton = document.createElement("button");
        replayButton.classList.add("replayButton");
        replayButton.innerHTML = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${now.getHours()}:${now.getMinutes() < 10 ? "0" + now.getMinutes() : now.getMinutes()}:${
            now.getSeconds() < 10 ? "0" + now.getSeconds() : now.getSeconds()
        }`;

        const saveButton = document.createElement("button");
        saveButton.classList.add("replaySaveButton");

        //リプレイボタンの追加
        const replayContainer = document.createElement("div");
        replayContainer.classList = "replayDataContainer";
        replayContainer.appendChild(replayButton);
        replayContainer.appendChild(saveButton);
        replayContainer.querySelectorAll("button").forEach((button) => {
            button.addEventListener("mouseover", () => {
                button.focus();
            });
            button.addEventListener("mouseleave", () => {
                if (document.activeElement == button) {
                    (button as HTMLButtonElement).blur();
                }
            });
        });

        qs("#replay .options").prepend(replayContainer);

        let tempDataListLength = 0;

        //座標の割り振り直し
        qsAll("#replay .replayButton").forEach((button, i) => {
            button.dataset.xy = `[0,${i}]`;
            tempDataListLength++;
        });

        qsAll("#replay .replaySaveButton").forEach((button, i) => {
            button.dataset.xy = `[1,${i}]`;
        });

        qs("#replay .back").dataset.xy = `[0,${tempDataListLength}]`;

        return { replayButton, saveButton };
    }
}
