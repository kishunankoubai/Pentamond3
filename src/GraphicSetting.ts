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

    static refresh(): void {
        this.loadData();
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
        const settings: (keyof typeof globalValues.graphic)[] = ["putShake", "removeShake", "playBackground"];
        settings.forEach((setting) => {
            [true, false].forEach((enabled) => {
                qsAddEvent(`#${setting}${enabled ? "On" : "Off"}`, "click", () => {
                    globalValues.graphic[setting] = enabled;
                    this.loadData();
                    DataManager.save();
                });
            });
        });
    }
}
