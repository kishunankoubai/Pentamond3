import { globalValues } from "./Global";
import { SceneTitle } from "./Scenes/SceneTitle";
import { DataCompressor } from "./Utilities/DataCompressor";
import { PageManager } from "./Utilities/Page/PageManager";
import { sceneManager } from "./Utilities/SceneManager";

export class DataManager {
    private static key = [11, 11];
    private static saveName = "contemporary";
    private static soloBGMKey = "Pentamond3-soloBGM";
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
    }

    static read() {
        if (globalValues.nosave) return;

        const compressedData = localStorage.getItem(DataManager.saveName);
        if (!compressedData) return;
        const data = DataCompressor.decompressArray(compressedData, this.key);
        if (data.length >= 2 && data.every((value) => Number.isInteger(value) && value >= 0 && value <= 10)) {
            globalValues.bgmVolume = data[0];
            globalValues.seVolume = data[1];
        }
        const soloBGM = localStorage.getItem(DataManager.soloBGMKey);
        if (soloBGM && this.availableBGMs.has(soloBGM)) globalValues.soloBGM = soloBGM;
    }

    static deletePlayData() {
        this.save();
        PageManager.resetMemory();
        sceneManager.change(SceneTitle);
    }

    static delete() {
        localStorage.removeItem(DataManager.saveName);
        localStorage.removeItem(DataManager.soloBGMKey);
        globalValues.bgmVolume = 10;
        globalValues.seVolume = 10;
        globalValues.soloBGM = "ならべてトライアングル";
        PageManager.resetMemory();
        sceneManager.change(SceneTitle);
    }
}
