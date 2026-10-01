import { globalValues } from "./Global";
import { SceneTitle } from "./Scenes/SceneTitle";
import { DataCompressor } from "./Utilities/DataCompressor";
import { PageManager } from "./Utilities/Page/PageManager";
import { sceneManager } from "./Utilities/SceneManager";
import { ControllerSettingManager } from "./ControllerSettingManager";
import { GraphicSetting } from "./GraphicSetting";
import { Music } from "./Utilities/Music/Music";
import { MusicManager } from "./Utilities/Music/MusicManager";

export class DataManager {
    private static key = [11, 11];
    private static saveName = "contemporary";
    private static soloBGMKey = "Pentamond3-soloBGM";
    static readonly settingStorageKeys = ["contemporary", "Pentamond3-soloBGM", "Pentamond3-graphicSetting", "Pentamond3-volumeSetting", ControllerSettingManager.storageKey];
    private static availableBGMs = new Set(["つみきのおしろ", "ならべてトライアングル", "おかたづけ", "さよならさんかく", "Top of the Pyramid"]);

    static save() {
        if (globalValues.nosave) return;
        const data = [
            globalValues.bgmVolume,
            globalValues.seVolume,
            //
        ];
        localStorage.setItem(DataManager.saveName, DataCompressor.compressArray(data, this.key));
        localStorage.setItem(DataManager.soloBGMKey, globalValues.soloBGM);
        localStorage.setItem("Pentamond3-graphicSetting", JSON.stringify(globalValues.graphic));
    }

    static read() {
        if (globalValues.nosave) return;

        ControllerSettingManager.read();

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
    }

    static deletePlayData() {
        this.save();
        PageManager.resetMemory();
        sceneManager.change(SceneTitle);
    }

    static delete() {
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
        globalValues.graphic = { putShake: true, removeShake: true, playBackground: true };
        Music.s$masterBGMVolume = 1;
        Music.s$masterSEVolume = 1;
        MusicManager.updateAllGain();
        GraphicSetting.refresh();
    }
}
