import { DataManager } from "./DataManager";
import { globalValues } from "./Global";
import { qs, qsAddEvent } from "./Utils";

export class GraphicSetting {
    static putShake = true;
    static removeShake = true;
    static playBackground = true;

    static init() {
        this.loadData();
        this.setupEvents();
    }

    private static updateButtonStyle() {
        if (!qs("#putShakeOn")) return;
        qs("#putShakeOn").style.color = this.putShake ? "#ee8888" : "";
        qs("#putShakeOff").style.color = this.putShake ? "" : "#ee8888";
        qs("#removeShakeOn").style.color = this.removeShake ? "#ee8888" : "";
        qs("#removeShakeOff").style.color = this.removeShake ? "" : "#ee8888";
        qs("#playBackgroundOn").style.color = this.playBackground ? "#ee8888" : "";
        qs("#playBackgroundOff").style.color = this.playBackground ? "" : "#ee8888";
    }

    private static loadData() {
        this.putShake = globalValues.graphic.putShake;
        this.removeShake = globalValues.graphic.removeShake;
        this.playBackground = globalValues.graphic.playBackground;

        this.updateButtonStyle();
    }

    private static setupEvents() {
        qsAddEvent("#putShakeOn", "click", () => {
            if (this.putShake) return;
            globalValues.graphic.putShake = true;
        });
        qsAddEvent("#putShakeOff", "click", () => {
            if (!this.putShake) return;
            globalValues.graphic.putShake = false;
        });
        qsAddEvent("#removeShakeOn", "click", () => {
            if (this.removeShake) return;
            globalValues.graphic.removeShake = true;
        });
        qsAddEvent("#removeShakeOff", "click", () => {
            if (!this.removeShake) return;
            globalValues.graphic.removeShake = false;
        });
        qsAddEvent("#playBackgroundOn", "click", () => {
            if (this.playBackground) return;
            globalValues.graphic.playBackground = true;
        });
        qsAddEvent("#playBackgroundOff", "click", () => {
            if (!this.playBackground) return;
            globalValues.graphic.playBackground = false;
        });

        qsAddEvent("#graphicSetting button", "click", () => {
            DataManager.save();
            this.loadData();
        });
    }
}
