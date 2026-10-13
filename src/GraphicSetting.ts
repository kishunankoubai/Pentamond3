import { DataManager } from "./DataManager";
import { globalValues } from "./Global";
import { qsAddEvent } from "./Utils";
import { setInteractionEnabled } from "./Utilities/Element/InteractionElement";

export class GraphicSetting {
    static putShake = true;
    static removeShake = true;
    static playBackground = true;
    static damageEffects = true;
    static timeWarningEffect = true;
    static playNotifications = true;
    private static readonly motionSettings = ["putShake", "removeShake", "playBackground", "damageEffects", "timeWarningEffect"] as const;

    static init() {
        this.loadData();
        this.setupEvents();
    }

    static refresh(): void {
        this.loadData();
    }

    private static updateButtonStyle() {
        (Object.keys(globalValues.graphic) as (keyof typeof globalValues.graphic)[]).forEach((setting) => {
            [true, false].forEach((enabled) => {
                const button = document.getElementById(`${setting}${enabled ? "On" : "Off"}`);
                if (!button) return;
                button.style.color = "";
                const suppressed = globalValues.graphic.reducedMotion && this.motionSettings.some((key) => key === setting);
                const effective = globalValues.graphic[setting] && !suppressed;
                button.classList.toggle("selectedValue", effective === enabled);
                button.setAttribute("aria-pressed", String(effective === enabled));
                setInteractionEnabled(button, !suppressed);
            });
        });
    }

    private static loadData() {
        this.putShake = this.isMotionEnabled("putShake");
        this.removeShake = this.isMotionEnabled("removeShake");
        this.playBackground = this.isMotionEnabled("playBackground");
        this.damageEffects = this.isMotionEnabled("damageEffects");
        this.timeWarningEffect = this.isMotionEnabled("timeWarningEffect");
        this.playNotifications = globalValues.graphic.playNotifications;
        document.body.classList.toggle("reducedPlayMotion", globalValues.graphic.reducedMotion);

        this.updateButtonStyle();
    }

    private static isMotionEnabled(setting: typeof this.motionSettings[number]): boolean {
        return globalValues.graphic[setting] && !globalValues.graphic.reducedMotion;
    }

    private static setupEvents() {
        const settings = Object.keys(globalValues.graphic) as (keyof typeof globalValues.graphic)[];
        settings.forEach((setting) => {
            [true, false].forEach((enabled) => {
                qsAddEvent(`#${setting}${enabled ? "On" : "Off"}`, "click", () => {
                    if (globalValues.graphic.reducedMotion && this.motionSettings.some((key) => key === setting)) return;
                    globalValues.graphic[setting] = enabled;
                    this.loadData();
                    DataManager.save();
                });
            });
        });
    }
}
