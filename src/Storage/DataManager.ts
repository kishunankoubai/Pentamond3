import { globalValues } from "../Config/UserSettings";
import { DataCompressor } from "../Utilities/Data/DataCompressor";
import { ControllerSettingManager } from "../Input/ControllerSettingManager";
import { GraphicSetting } from "../UI/GraphicSetting";
import { Music } from "../Utilities/Music/Music";
import { MusicManager } from "../Utilities/Music/MusicManager";
import { bgmTracks } from "../Audio/BGMTracks";
import { PlayData } from "./PlayData";
import { PageNotice } from "../Utilities/Feedback/PageNotice";
import { KeyboardSettingManager } from "../Input/KeyboardSettingManager";

export class DataManager {
    private static readonly volumeRadices = [11, 11];
    // 既存の保存データを引き続き読むため、保存キーの文字列は維持する。
    private static readonly volumeStorageKey = "contemporary";
    private static soloBGMKey = "Pentamond3-soloBGM";
    private static multiBGMKey = "Pentamond3-multiBGM";
    static readonly settingStorageKeys = [
        "contemporary",
        "Pentamond3-soloBGM",
        "Pentamond3-multiBGM",
        "Pentamond3-graphicSetting",
        "Pentamond3-volumeSetting",
        ControllerSettingManager.storageKey,
        KeyboardSettingManager.storageKey,
    ];
    private static availableBGMs = new Set<string>(bgmTracks.map(({ name }) => name));

    static save() {
        if (globalValues.nosave) return;
        const data = [globalValues.bgmVolume, globalValues.seVolume];
        try {
            localStorage.setItem(this.volumeStorageKey, DataCompressor.compressArray(data, this.volumeRadices));
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
        KeyboardSettingManager.read();
        try {
            const compressedData = localStorage.getItem(this.volumeStorageKey);
            if (compressedData) {
                const data = DataCompressor.decompressArray(compressedData, this.volumeRadices);
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
                        const settings = Object.keys(globalValues.graphic) as (keyof typeof globalValues.graphic)[];
                        settings.forEach((setting) => {
                            if (typeof graphic[setting] === "boolean") globalValues.graphic[setting] = graphic[setting];
                        });
                    }
                } catch (error) {
                    console.warn("グラフィック設定を読み込めませんでした", error);
                }
            }
        } catch (error) {
            console.warn("設定の保存領域を読み込めませんでした。初期設定で続行します。", error);
        }
    }

    /** 保存を行わず初期値を即時反映する。リプレイは変更しない。 */
    static resetSettings(): void {
        this.settingStorageKeys.forEach((key) => localStorage.removeItem(key));
        ControllerSettingManager.reset();
        KeyboardSettingManager.reset();
        globalValues.bgmVolume = 10;
        globalValues.seVolume = 10;
        globalValues.soloBGM = "ならべてトライアングル";
        globalValues.multiBGM = "Top of the Pyramid";
        globalValues.graphic = {
            putShake: true,
            removeShake: true,
            playBackground: true,
            damageEffects: true,
            timeWarningEffect: true,
            playNotifications: true,
            reducedMotion: false,
            blockSymbols: false,
        };
        Music.s$masterBGMVolume = 1;
        Music.s$masterSEVolume = 1;
        MusicManager.updateAllGain();
        GraphicSetting.refresh();
    }
}
