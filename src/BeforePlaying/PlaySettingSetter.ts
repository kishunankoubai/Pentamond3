import { qsAddEvent } from "../Utils";

export type PlaySetting = Readonly<EditablePlaySetting>;

type EditablePlaySetting = {
    playerNumber: number;
    mode: number;
    maxGameTime: number;
    handy: readonly number[];
};

/**
 * ゲームが始まる直前の人数とかルールとかを決める
 */
export class PlaySettingSetter {
    private static readonly playSetting: EditablePlaySetting = {
        playerNumber: 1,
        mode: 1,
        maxGameTime: 150,
        handy: [1],
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
        });
    }
}
