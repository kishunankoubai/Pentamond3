import { MyEventListener, EventId, EventManager } from "../UtilManagers/EventManager";
import { LoopManager } from "../Utilities/Loop/LoopManager";

export type AutoKeyboardInputData = {
    time: number;
    keyCode: string;
    type: "keydown" | "keyup" | "downup";
};

export class AutoKeyboardManager implements MyEventListener {
    private loop: LoopManager = new LoopManager();
    private inputData: AutoKeyboardInputData[] = [];
    private inputDataTask: AutoKeyboardInputData[] = [];
    private pressingKeys: string[] = [];
    private pressTimes: number[] = [];
    private valid: boolean = false;
    readonly eventClassNames: string[] = ["onKeydown", "onKeyup"];
    eventIds: EventId[] = [];
    addEvent(classNames: string[], handler: Function): EventId {
        const eventId = EventManager.addEvent({ classNames: classNames.filter((className) => this.eventClassNames.includes(className)), handler });
        this.eventIds.push(eventId);
        return eventId;
    }

    constructor() {}

    //有効かどうか
    get g$isValid(): boolean {
        return this.valid;
    }

    //押された最新のキー
    get g$latestPressingKey(): string {
        return this.pressingKeys.length != 0 ? this.pressingKeys[this.pressingKeys.length - 1] : "";
    }

    //押された最古のキー
    get g$oldestPressingKey(): string {
        return this.pressingKeys.length != 0 ? this.pressingKeys[0] : "";
    }

    //まだ押されているキーのうちの押された最古の時間
    get g$latestPressTime(): number {
        return this.pressTimes.length != 0 ? this.pressTimes[this.pressTimes.length - 1] : -1;
    }

    //まだ押されているキーのうちの押された最新の時間
    get g$oldestPressTime(): number {
        return this.pressTimes.length != 0 ? this.pressTimes[0] : -1;
    }

    get g$inputData() {
        return this.inputData;
    }

    set s$inputData(inputData: AutoKeyboardInputData[]) {
        if (!this.loop.g$isStopping) {
            return;
        }
        this.inputData = inputData;
        this.inputDataTask = window.structuredClone(inputData);

        const keydownEvent = (keyCode: string) => {
            if (!this.pressingKeys.includes(keyCode)) {
                this.pressingKeys.push(keyCode);
                this.pressTimes.push(Date.now());
                EventManager.executeListeningEvents("onKeydown", this.eventIds);
                // console.log("Pressed:" + keyCode);
            }
        };
        const keyupEvent = (keyCode: string) => {
            this.pressingKeys = this.pressingKeys.filter((keys, i) => {
                if (keys == keyCode) {
                    this.pressTimes[i] = -1;
                }
                return keys != keyCode;
                //console.log("Unpressed:" + keyCode);
            });
            this.pressTimes = this.pressTimes.filter((time) => time != -1);
            EventManager.executeListeningEvents("onKeyup", this.eventIds);
        };

        this.loop.removeAllEvent();
        this.loop.addHandler(["loop"], () => {
            while (true) {
                if (this.inputDataTask.length) {
                    if (this.inputDataTask[0].time <= this.loop.g$elapsedTime) {
                        if (["keydown", "downup"].includes(this.inputDataTask[0].type)) {
                            keydownEvent(this.inputDataTask[0].keyCode);
                        }
                        if (["keyup", "downup"].includes(this.inputDataTask[0].type)) {
                            keyupEvent(this.inputDataTask[0].keyCode);
                        }
                        this.inputDataTask.shift();
                    } else {
                        break;
                    }
                } else {
                    this.loop.stop();
                    return;
                }
            }
        });
    }

    //入力を受け取るのを開始する
    start() {
        // console.log(this.loop.g$elapsedTime, this.inputDataTask.length);
        if (this.loop.g$elapsedTime && this.inputDataTask.length) {
            this.loop.start();
        }
        this.valid = true;
    }

    //入力を受け取るのを停止する
    stop() {
        this.valid = false;
        this.loop.stop();
        this.pressingKeys = [];
        this.pressTimes = [];
    }

    playStart() {
        if (!this.inputDataTask.length) {
            return;
        }
        this.loop.start();
    }

    playReset() {
        this.loop.reset();
        this.s$inputData = this.inputData;
    }

    //指定したキーが押されているか
    isPressing(keyCode: string): boolean {
        return this.pressingKeys.includes(keyCode);
    }

    //指定した複数のキーがすべて押されているか
    arePressing(keyCodes: string[]): boolean {
        let arePressing = true;
        keyCodes.forEach((keyCode) => {
            arePressing = arePressing && this.isPressing(keyCode);
        });
        return arePressing;
    }

    //指定した複数のキーのどれかが押されているか
    existsPressingKey(keyCodes: string[]) {
        let existsPressingKey = false;
        keyCodes.forEach((keyCode) => {
            existsPressingKey = existsPressingKey || this.isPressing(keyCode);
        });
        return existsPressingKey;
    }

    //指定したキーが押された時間を返す
    //選択されていない場合は-1を返す
    getPressTime(keyCode: string): number {
        if (this.pressingKeys.indexOf(keyCode) == -1) {
            return -1;
        }
        return this.pressTimes[this.pressingKeys.indexOf(keyCode)];
    }

    //指定した複数のキーの中で最も遅くに押されたものを返す
    //どれも押されていない場合は空文字を返す
    getLatestPressingKey(keyCodes: string[]): string {
        let index = -1;
        keyCodes.forEach((keyCode) => {
            const i = this.pressingKeys.indexOf(keyCode);
            if (index < i) {
                index = i;
            }
        });
        return index == -1 ? "" : this.pressingKeys[index];
    }

    //指定した複数のキーの中で最も早くに押されたものを返す
    //どれも押されていない場合は空文字を返す
    getOldestPressingKey(keyCodes: string[]): string {
        let index = Infinity;
        keyCodes.forEach((keyCode) => {
            const i = this.pressingKeys.indexOf(keyCode);
            if (i < index && i != -1) {
                index = i;
            }
        });
        return index == -1 ? "" : this.pressingKeys[index];
    }

    //指定した複数のキーの中で押されているものをすべて返す
    getAllPressingKeys(keyCodes: string[]): string[] {
        return this.pressingKeys.filter((keyCode) => keyCodes.includes(keyCode));
    }
}
