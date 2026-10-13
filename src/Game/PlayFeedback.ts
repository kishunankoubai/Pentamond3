import type { SimulationClock } from "../Utilities/Loop/SimulationClock";
import { GraphicSetting } from "../GraphicSetting";

/** 表示だけをゲーム内時計に同期する。乱数・入力・ゲームの待機時間には触れない。 */
export class PlayFeedback {
    readonly element = document.createElement("div");
    readonly rowFlash = document.createElement("div");
    readonly boardCollapse = document.createElement("div");
    private readonly messages = document.createElement("div");
    private readonly pending = document.createElement("div");
    private readonly removals = new Set<() => void>();
    private readonly flashCancels: (() => void)[] = [];
    private readonly collapseCancels: (() => void)[] = [];

    constructor(
        private readonly clock: SimulationClock,
        private readonly playerCount = 1
    ) {
        this.element.className = "playFeedback";
        this.element.hidden = !GraphicSetting.playNotifications;
        this.messages.className = "playFeedbackMessages";
        this.pending.className = "pendingAttack";
        this.pending.hidden = true;
        this.rowFlash.className = "clearedRowFlash";
        this.rowFlash.hidden = true;
        this.rowFlash.setAttribute("aria-hidden", "true");
        this.boardCollapse.className = "boardCollapse";
        this.boardCollapse.hidden = true;
        this.boardCollapse.setAttribute("aria-hidden", "true");
        for (let i = 0; i < 8; i++) {
            const shard = document.createElement("span");
            shard.style.left = `${i * 12}%`;
            shard.style.top = `${42 + (i % 3) * 12}%`;
            shard.style.setProperty("--fragment-drift", `${(i - 3.5) * 2}cqh`);
            shard.style.setProperty("--fragment-turn", `${i % 2 ? 35 : -35}deg`);
            this.boardCollapse.append(shard);
        }
        this.element.append(this.pending, this.messages);
    }

    show(title: string, detail = "", tone: "trick" | "penalty" | "attack" = "trick"): void {
        if (!GraphicSetting.playNotifications) return;
        if (tone === "attack" && this.playerCount === 1) return;
        const item = document.createElement("div");
        item.className = `feedbackMessage ${tone}`;
        const name = document.createElement("div");
        name.className = "feedbackTitle";
        name.textContent = title;
        const value = document.createElement("div");
        value.className = "feedbackValue";
        value.textContent = detail;
        if (title) item.append(name);
        if (detail) item.append(value);
        this.messages.appendChild(item);
        while (this.messages.childElementCount > 2) this.messages.firstElementChild?.remove();
        let cancel: () => void;
        cancel = this.clock.schedule(
            this.clock.now + 1300,
            () => {
                item.remove();
                this.removals.delete(cancel);
            },
            3
        );
        this.removals.add(cancel);
    }

    showRewards(score: number, recovery?: number): void {
        if (!GraphicSetting.playNotifications) return;
        this.show("");
        const value = document.createElement("div");
        value.className = "feedbackValue";
        const rewards: [string, number][] = [["スコア", score]];
        if (recovery !== undefined) rewards.push(["回復", recovery]);
        rewards.forEach(([label, amount]) => {
            const row = document.createElement("div");
            row.className = "feedbackReward";
            const name = document.createElement("span");
            name.textContent = label;
            const quantity = document.createElement("span");
            quantity.textContent = `+${amount}`;
            row.append(name, quantity);
            value.append(row);
        });
        this.messages.lastElementChild!.append(value);
    }

    flashRow(clearSoundIndex = 0): void {
        this.flashCancels.splice(0).forEach((cancel) => cancel());
        this.rowFlash.hidden = true;
        if (!GraphicSetting.removeShake) return;
        const colors = ["#ffffff", "#fff0ee", "#ffdad5", "#ffc1b9", "#ffa296", "#ff8173", "#ff6054"];
        this.rowFlash.style.setProperty("--clear-color", colors[Math.min(6, Math.max(0, Math.floor(clearSoundIndex)))]);
        // 下の盤面を隠さないよう、ピークでも68%は透過させる。
        const peakOpacity = 0.5;
        this.rowFlash.style.opacity = String(peakOpacity);
        this.rowFlash.hidden = false;
        // 300ms見せてから300msで消す。壁時計ではなく、停止・倍速に追従する時計を使う。
        const start = this.clock.now;
        for (let step = 1; step <= 15; step++) {
            this.flashCancels.push(
                this.clock.schedule(
                    start + 300 + step * 20,
                    () => {
                        this.rowFlash.style.opacity = String(peakOpacity * (1 - step / 15));
                        if (step === 15) {
                            this.rowFlash.hidden = true;
                            this.flashCancels.length = 0;
                        }
                    },
                    3
                )
            );
        }
    }

    updatePending(attack: number, incoming: number, damaging: boolean): void {
        const text =
            !GraphicSetting.playNotifications || this.playerCount === 1
                ? ""
                : [attack > 0 ? `攻撃 ${attack}` : "", incoming > 0 ? `${damaging ? "ダメージ" : "被攻撃"} ${incoming}` : ""].filter(Boolean).join("\n");
        if (this.pending.textContent !== text) this.pending.textContent = text;
        this.pending.hidden = !text;
        this.pending.classList.toggle("incoming", incoming > 0);
    }

    /** ひび割れと三角の破片が落ちる。ゲーム内時計なので停止・再生速度に追従する。 */
    collapseBoard(): void {
        this.collapseCancels.splice(0).forEach((cancel) => cancel());
        this.boardCollapse.hidden = true;
        if (!GraphicSetting.damageEffects) return;
        this.boardCollapse.style.setProperty("--collapse-progress", "0");
        this.boardCollapse.style.opacity = "0.5";
        this.boardCollapse.hidden = false;
        const start = this.clock.now;
        for (let step = 1; step <= 15; step++) {
            this.collapseCancels.push(
                this.clock.schedule(
                    start + step * 30,
                    () => {
                        this.boardCollapse.style.setProperty("--collapse-progress", String(step / 15));
                        this.boardCollapse.style.opacity = String(0.5 * (1 - step / 15));
                        if (step === 15) {
                            this.boardCollapse.hidden = true;
                            this.collapseCancels.length = 0;
                        }
                    },
                    3
                )
            );
        }
    }

    dispose(): void {
        this.removals.forEach((cancel) => cancel());
        this.removals.clear();
        this.flashCancels.splice(0).forEach((cancel) => cancel());
        this.collapseCancels.splice(0).forEach((cancel) => cancel());
        this.element.remove();
        this.rowFlash.remove();
        this.boardCollapse.remove();
    }
}
