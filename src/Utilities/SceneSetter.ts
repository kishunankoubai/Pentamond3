import { LifeCounter } from "./Flags";
import { MyEventListener } from "./MyEventListener";
import { Scene } from "./SceneManager";

export abstract class SceneSetter extends MyEventListener {
    /*
     * set
     */

    protected setFlag: LifeCounter = new LifeCounter(1);
    protected scene: Scene;

    constructor(scene: Scene) {
        super();
        this.scene = scene;
    }

    /**
     * setEventが実行されたか
     */
    get g$isSet(): boolean {
        return this.setFlag.g$finished;
    }

    /**
     * シーンに対し初期設定を行う
     */
    set(): void {
        if (this.setFlag.g$finished) return;
        this.progressSet();
        this.executeEvent("set");
        this.setFlag.countUp();
    }

    protected abstract progressSet(): void;
}
