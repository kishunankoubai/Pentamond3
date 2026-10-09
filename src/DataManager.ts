import { globalValues } from "./Global";
import { SceneTitle } from "./Scenes/SceneTitle";
import { DataCompressor } from "./Utilities/DataCompressor";
import { PageManager } from "./Utilities/Page/PageManager";
import { sceneManager } from "./Utilities/SceneManager";
import { ControllerSettingManager } from "./ControllerSettingManager";
import { GraphicSetting } from "./GraphicSetting";
import { Music } from "./Utilities/Music/Music";
import { MusicManager } from "./Utilities/Music/MusicManager";
import { bgmTracks } from "./BGMTracks";
import { PlayData } from "./PlayData";
import { PageNotice } from "./Utilities/Feedback/PageNotice";

export class DataManager {
    private static key = [11, 11];
    private static saveName = "contemporary";
    private static soloBGMKey = "Pentamond3-soloBGM";
    private static multiBGMKey = "Pentamond3-multiBGM";
    static readonly settingStorageKeys = ["contemporary", "Pentamond3-soloBGM", "Pentamond3-multiBGM", "Pentamond3-graphicSetting", "Pentamond3-volumeSetting", ControllerSettingManager.storageKey];
    private static availableBGMs = new Set<string>(bgmTracks.map(({ name }) => name));

    static save() {
        if (globalValues.nosave) return;
        const data = [
            globalValues.bgmVolume,
            globalValues.seVolume,
            //
        ];
        try {
            localStorage.setItem(DataManager.saveName, DataCompressor.compressArray(data, this.key));
            localStorage.setItem(DataManager.soloBGMKey, globalValues.soloBGM);
            localStorage.setItem(DataManager.multiBGMKey, globalValues.multiBGM);
            localStorage.setItem("Pentamond3-graphicSetting", JSON.stringify(globalValues.graphic));
        } catch (error) {
            console.warn("設定を保存できませんでした。現在のプレイには反映されます。", error);
            PageNotice.notify("設定を保存できませんでした。 今回の起動中は反映されますが、 再読み込みすると失われる場合があります。 保存領域の空きやブラウザーの設定を確認してください。");
        }
    }

    static read() {
        PlayData.read();
        if (globalValues.nosave) return;

        ControllerSettingManager.read();
        try {
            const compressedData = localStorage.getItem(DataManager.saveName);
            if (compressedData) {
                const data = DataCompressor.decompressArray(compressedData, this.key);
                if (data.length >= 2 && data.every((value) => Number.isInteger(value) && value >= 0 && value <= 10)) {
                    globalValues.bgmVolume = data[0];
                    globalValues.seVolume = data[1];
                }
            }
            const soloBGM = localStorage.getItem(DataManager.soloBGMKey);
            if (soloBGM && this.availableBGMs.has(soloBGM)) globalValues.soloBGM = soloBGM;
            const multiBGM = localStorage.getItem(DataManager.multiBGMKey);
            if (multiBGM && this.availableBGMs.has(multiBGM)) globalValues.multiBGM = multiBGM;
            const graphicSetting = localStorage.getItem("Pentamond3-graphicSetting");
            if (graphicSetting) {
                try {
                    const graphic = JSON.parse(graphicSetting);
                    if (graphic && typeof graphic === "object") {
                        const settings: (keyof typeof globalValues.graphic)[] = ["putShake", "removeShake", "playBackground"];
                        settings.forEach((setting) => {
                            if (typeof graphic[setting] === "boolean") globalValues.graphic[setting] = graphic[setting];
                        });
                    }
                } catch (error) {
                    console.warn("グラフィック設定を読み込めませんでした", error);
                }
            }
        } catch (error) { console.warn("設定の保存領域を読み込めませんでした。初期設定で続行します。", error); }
    }

    static deletePlayData() {
        PlayData.reset();
        PageManager.resetMemory();
        sceneManager.change(SceneTitle);
    }

    static delete() {
        PlayData.reset();
        this.resetSettings();
        PageManager.resetMemory();
        sceneManager.change(SceneTitle);
    }

    /** 保存を行わず初期値を即時反映する。リプレイは変更しない。 */
    static resetSettings(): void {
        this.settingStorageKeys.forEach((key) => localStorage.removeItem(key));
        ControllerSettingManager.reset();
        globalValues.bgmVolume = 10;
        globalValues.seVolume = 10;
        globalValues.soloBGM = "ならべてトライアングル";
        globalValues.multiBGM = "Top of the Pyramid";
        globalValues.graphic = { putShake: true, removeShake: true, playBackground: true };
        Music.s$masterBGMVolume = 1;
        Music.s$masterSEVolume = 1;
        MusicManager.updateAllGain();
        GraphicSetting.refresh();
    }
}
