import { qsAddEvent } from "../Utils";
import { sceneManager } from "../Utilities/SceneManager";
import { defaultMaxGameTime } from "../Settings";
import { getModeHelpPageId } from "../HelpPages";

export type PlaySetting = Readonly<EditablePlaySetting>;

type EditablePlaySetting = {
    playerNumber: number;
    mode: number;
    maxGameTime: number;
    handy: number[];
    targetLines: number;
};

/**
 * ゲームが始まる直前の人数とかルールとかを決める
 */
export class PlaySettingSetter {
    private static readonly playSetting: EditablePlaySetting = {
        playerNumber: 1,
        mode: 1,
        maxGameTime: defaultMaxGameTime,
        handy: [1],
        targetLines: 15,
    };

    /**
     *
     * @returns 絶対変更不可なplaySetting
     */
    static getPlaySetting(): PlaySetting {
        return Object.freeze(structuredClone(this.playSetting));
    }

    static setEvents() {
        // モードを決める
        qsAddEvent(".button[data-mode]", "click", (element) => {
            // 一人プレイの時は聞かれないので1にしておく
            this.playSetting.playerNumber = 1;
            this.playSetting.mode = Number(element.dataset.mode);
        });

        // 人数を決める
        qsAddEvent(".button[data-player]", "click", (element) => {
            this.playSetting.playerNumber = Number(element.dataset.player);
            this.playSetting.handy = Array.from({ length: this.playSetting.playerNumber }, (_, index) => this.playSetting.handy[index] ?? 1);
        });

        qsAddEvent("#playPrepareSettingButton", "click", () => {
            sceneManager.g$currentPageManager?.openPage(this.playSetting.mode === 1 ? "survivalPlaySetting" : "linePlaySetting");
        });

        document.querySelectorAll<HTMLElement>("#survivalPlaySetting [data-max-time]").forEach((button) => {
            button.addEventListener("click", () => {
                this.playSetting.maxGameTime = button.dataset.maxTime === "Infinity" ? Infinity : Number(button.dataset.maxTime);
                this.render();
            });
        });

        document.querySelectorAll<HTMLElement>("#survivalPlaySetting [data-handy-player][data-handy-delta]").forEach((button) => {
            button.addEventListener("click", () => {
                const playerIndex = Number(button.dataset.handyPlayer);
                const delta = Number(button.dataset.handyDelta);
                const current = this.playSetting.handy[playerIndex] ?? 1;
                this.playSetting.handy[playerIndex] = Math.round(Math.max(0.1, Math.min(10, current + delta)) * 10) / 10;
                this.render();
            });
        });

        document.querySelectorAll<HTMLElement>("#linePlaySetting [data-target-lines-delta]").forEach((button) => {
            button.addEventListener("click", () => {
                this.playSetting.targetLines = Math.max(1, Math.min(30, this.playSetting.targetLines + Number(button.dataset.targetLinesDelta)));
                this.render();
            });
        });

        sceneManager.g$currentPageManager?.addHandler(["changePage-playPrepare", "changePage-survivalPlaySetting", "changePage-linePlaySetting"], () => this.render());
        this.render();
    }

    private static render(): void {
        const modeHelpButton = document.getElementById("playPrepareModeHelpButton");
        if (modeHelpButton) modeHelpButton.dataset.page = getModeHelpPageId(this.playSetting.mode, this.playSetting.playerNumber);
        const trickListButton = document.getElementById("playPrepareTrickListButton");
        if (trickListButton) trickListButton.hidden = this.playSetting.mode !== 1;

        document.querySelectorAll<HTMLElement>("#survivalPlaySetting [data-max-time]").forEach((button) => {
            const value = button.dataset.maxTime === "Infinity" ? Infinity : Number(button.dataset.maxTime);
            button.classList.toggle("selectedValue", value === this.playSetting.maxGameTime);
        });

        document.querySelectorAll<HTMLElement>("#survivalPlaySetting [data-handy-row]").forEach((row) => {
            const playerIndex = Number(row.dataset.handyRow);
            row.style.display = playerIndex < this.playSetting.playerNumber ? "flex" : "none";
            const value = row.querySelector<HTMLElement>(".handyValue");
            if (value) value.textContent = `×${(this.playSetting.handy[playerIndex] ?? 1).toFixed(1)}`;
        });

        const targetLines = document.getElementById("targetLinesValue");
        if (targetLines) targetLines.textContent = `${this.playSetting.targetLines}列`;
    }
}
