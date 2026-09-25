import { BlockManager } from "../BlockOperate/BlockManager";
import { MyEventListener } from "../Utilities/MyEventListener";
import { LoopManager } from "../Utilities/Loop/LoopManager";
import { Monoiamond } from "../BlockOperate/Monoiamond";
import * as Setting from "../Settings";
import { gameEvents } from "./GameMode";

/**
 * じゃまモンドに関連する処理を行う
 */
export class NuisanceMondManager extends MyEventListener {
    //実際にnuisanceBlockを表示するblockManager
    private blockManager: BlockManager;
    //現在盤面上にあるnuisanceBlockを持つ配列
    private nuisanceMonds: Monoiamond[] = [];
    //前回のdamageによるpenalty
    //どのブロックも破壊しないまま地面に着いたnuisanceBlockの数
    private penalty: number = 0;
    //damage処理中ならtrue
    private damaging: boolean = false;
    //progressを繰り返し実行する用のinterval
    private loop: LoopManager = new LoopManager();
    //damage用に生成するnuisanceBlockの個数
    private task = 0;
    //一回のdamage中のnuisanceBlockの生成の進行度合い
    private taskCount = 0;
    //nuisanceBlockを三回に一回にする用のcount
    private progressCount = 0;
    private spawnCoordinates: number[] = [];
    private spawnCoordinateMemory: number[] = [];

    /**
     * @param startDamage ダメージ処理開始
     * @param destroyMond モンド破壊
     * @param damageBoard 盤面へのダメージ
     * @param finishDamage ダメージ処理終了
     */
    constructor(blockManager: BlockManager) {
        super();
        this.blockManager = blockManager;
        gameEvents.push(
            this.loop.addHandler("loop", () => {
                this.damageProcess();
            })
        );
    }

    //damage処理中でないときは前回のdamageによるpenaltyを返す
    //damage処理中のときは-1を返す
    get g$penalty(): number {
        if (this.damaging) return -1;
        return this.penalty;
    }

    get g$spawnCoordinateMemory(): number[] {
        return this.spawnCoordinateMemory;
    }

    set s$spawnCoordinates(spawnCoordinates: number[]) {
        this.spawnCoordinates = spawnCoordinates;
    }

    //damageProgressを呼び出す頻度を取得する
    private get g$progressFrequency(): number {
        const frequency = Math.floor(Setting.damageTime / (Setting.damageGrace * (this.task - 1) + Setting.playHeight));
        if (frequency < 5) return 5;
        else return frequency;
    }

    //指定した座標でNuisanceBlockを生成する
    private createNuisanceBlock(x: number, y: number) {
        const nuisanceMond = new Monoiamond(x, y, "g", false);
        if (this.blockManager.canDisplayMonoiamond(nuisanceMond)) {
            this.blockManager.displayMonoiamond(nuisanceMond);
            this.nuisanceMonds.push(nuisanceMond);
        } else if (!this.blockManager.getBlockProperty(x, y)[1]) {
            this.blockManager.remove(x, y);
        } else if (0 < x) {
            this.blockManager.remove(x - 1, y);
        } else if (x < Setting.playWidth - 1) {
            this.blockManager.remove(x + 1, y);
        } else {
            this.blockManager.remove(x, y);
        }
        this.spawnCoordinateMemory.push(x);
    }

    //taskの分だけNuisanceBlockによるdamage処理を行う
    damage(task: number) {
        //すでにdamage処理中のとき、taskを増やす
        if (this.damaging && task > 0) {
            this.task += task;
            this.loop.reset();
            this.loop.s$loopFrequency = this.g$progressFrequency;
            return;
        }

        this.damaging = true;
        this.penalty = 0;
        this.task = task;
        this.progressCount = 0;
        this.loop.reset();
        this.loop.s$loopFrequency = this.g$progressFrequency;
        this.executeEvent("startDamage");
    }

    //NuisanceBlockを進行させて、すでにあるブロックとぶつかった場合は対消滅する
    private progress() {
        let damageBoard = false;
        for (const nuisanceMond of this.nuisanceMonds) {
            damageBoard = false;

            const visible = (dx: number, dy: number) => {
                return this.blockManager.getBlockProperty(nuisanceMond.g$x + dx, nuisanceMond.g$y + dy)[2];
            };

            const direction = (dx: number, dy: number) => {
                return this.blockManager.getBlockProperty(nuisanceMond.g$x + dx, nuisanceMond.g$y + dy)[1];
            };
            const remove = (dx: number, dy: number) => {
                if (dx != 0 || dy != 0) {
                    this.blockManager.remove(nuisanceMond.g$x + dx, nuisanceMond.g$y + dy);
                }
                this.blockManager.removeMonoiamond(nuisanceMond);
            };

            const isGrounded = () => {
                return nuisanceMond.g$y == Setting.playHeight - 1;
            };

            //左端でも右端でもないとき
            if (0 < nuisanceMond.g$x && nuisanceMond.g$x < Setting.playWidth - 1) {
                //左隣が存在するとき
                if (visible(-1, 0)) {
                    remove(-1, 0);
                    //右隣が存在するとき
                } else if (visible(1, 0)) {
                    remove(1, 0);
                    //一番下に着いたとき
                    //このときは対消滅するブロックがないため、代わりにpenaltyを受ける
                } else if (isGrounded()) {
                    damageBoard = true;
                    remove(0, 0);
                    //真下が下向きで存在するとき
                } else if (visible(0, 1) && !direction(0, 1)) {
                    remove(0, 1);
                    //左下が下向きで存在するとき
                } else if (visible(-1, 1) && !direction(-1, 1)) {
                    remove(-1, 1);
                    //右下が下向きで存在するとき
                } else if (visible(1, 1) && !direction(1, 1)) {
                    remove(1, 1);
                    //真下が上向きで存在するとき
                } else if (visible(0, 1)) {
                    remove(0, 1);
                }
                //左端ではないとき
            } else if (0 < nuisanceMond.g$x) {
                //左隣が存在するとき
                if (visible(-1, 0)) {
                    remove(-1, 0);
                    //一番下に着いたとき
                    //このときは対消滅するブロックがないため、代わりにpenaltyを受ける
                } else if (isGrounded()) {
                    damageBoard = true;
                    remove(0, 0);
                    //真下が下向きで存在するとき
                } else if (visible(0, 1) && !direction(0, 1)) {
                    remove(0, 1);
                    //左下が下向きで存在するとき
                } else if (visible(-1, 1) && !direction(-1, 1)) {
                    remove(-1, 1);
                    //真下が上向きで存在するとき
                } else if (visible(0, 1)) {
                    remove(0, 1);
                }
                //右端ではないとき
            } else if (nuisanceMond.g$x < Setting.playWidth - 1) {
                //右隣が存在するとき
                if (visible(1, 0)) {
                    remove(1, 0);
                    //一番下に着いたとき
                    //このときは対消滅するブロックがないため、代わりにpenaltyを受ける
                } else if (isGrounded()) {
                    damageBoard = true;
                    remove(0, 0);
                    //真下が下向きで存在するとき
                } else if (visible(0, 1) && !direction(0, 1)) {
                    remove(0, 1);
                    //右下が下向きで存在するとき
                } else if (visible(1, 1) && !direction(1, 1)) {
                    remove(1, 1);
                    //真下が上向きで存在するとき
                } else if (visible(0, 1)) {
                    remove(0, 1);
                }
                //右端かつ左端のとき
            } else {
                //一番下に着いたとき
                if (isGrounded()) {
                    damageBoard = true;
                    remove(0, 0);
                    //真下が存在するとき
                } else if (visible(0, 1)) {
                    remove(0, 1);
                }
            }

            //上記の条件に一つも引っかからなかったとき
            if (nuisanceMond.g$visible) {
                this.blockManager.removeMonoiamond(nuisanceMond);
                nuisanceMond.s$y = nuisanceMond.g$y + 1;
                this.blockManager.displayMonoiamond(nuisanceMond);
            } else {
                if (damageBoard) {
                    this.executeEvent("damageBoard");
                    this.penalty++;
                } else {
                    this.executeEvent("destroyMond");
                }
            }
        }

        //対消滅したnuisanceBlockをリストから削除する
        this.nuisanceMonds = this.nuisanceMonds.filter((nuisanceMond) => nuisanceMond.g$visible);
        this.executeEvent("progress");
    }

    //progressFrequencyの頻度でNuisanceBlockを進行させつつ、三回に一回の割合で、taskの分だけNuisanceBlockを生成する
    private damageProcess() {
        if (this.progressCount == 0) {
            //指定されたtaskの量の生成が完了していないとき
            if (this.taskCount < this.task) {
                this.progress();
                const x = this.spawnCoordinates.length ? this.spawnCoordinates.shift()! : Math.floor(Math.random() * Setting.playWidth);
                this.createNuisanceBlock(x, 0);
                this.progressCount++;
                this.taskCount++;
                //すでにtaskの量の生成を完了していて、盤面に残っているnuisanceBlockが存在しないとき
            } else if (this.nuisanceMonds.length == 0) {
                this.finishDamage();
                //すでにtaskの量の生成を完了しているが盤面にnuisanceBlockが残っているとき
            } else {
                this.progress();
            }
        } else {
            //盤面に残っているnuisanceBlockが存在しないとき
            if (this.nuisanceMonds.length == 0) {
                this.progressCount = 0;
                //盤面にnuisanceBlockが残っているとき
            } else {
                this.progress();
                this.progressCount++;
            }

            if (this.progressCount == Setting.damageGrace) {
                this.progressCount = 0;
            }
        }
    }

    //damage処理を終了させる
    private finishDamage() {
        this.loop.reset();
        this.task = 0;
        this.progressCount = 0;
        this.taskCount = 0;
        this.executeEvent("finishDamage");
        this.damaging = false;
    }

    //damage処理を中止する
    cancelDamage(): void {
        this.loop.reset();
        for (const nuisanceMond of this.nuisanceMonds) {
            this.blockManager.removeMonoiamond(nuisanceMond);
        }
        this.task = 0;
        this.progressCount = 0;
        this.taskCount = 0;
        this.damaging = false;
    }

    /**
     * damage処理を一時中断する
     */
    stop(): void {
        if (!this.damaging) {
            return;
        }
        this.loop.stop();
    }

    /**
     * 一時中断していたdamage処理を再開する
     */
    start(): void {
        if (!this.damaging) {
            return;
        }
        this.loop.start();
    }
}
