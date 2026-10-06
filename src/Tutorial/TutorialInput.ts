import { GamepadObserver } from "../Utilities/Interaction/GamepadObserver";
import { InputObserver } from "../Utilities/Interaction/InputObserver";

/** 養成所内だけで共有する入力機器。配置・機器選択は保存しない。 */
export class TutorialInput {
    static selected: InputObserver | null = null;
    private static readonly menuPages = ["tutorial", "operateTutorial", "BasicRule", "advancedRule", "trickTutorial"];

    static get available(): boolean {
        const input = this.selected;
        return !!input && (!(input instanceof GamepadObserver) || !!navigator.getGamepads?.()[input.g$index]?.connected);
    }

    static isMenu(pageId: string): boolean { return this.menuPages.includes(pageId); }
    static acceptsMenuInput(pageId: string, input: InputObserver): boolean {
        return !this.isMenu(pageId) || input === this.selected;
    }
}
