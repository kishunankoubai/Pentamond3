import { GamePlayer } from "./Game/GamePlayer";
import { qsAll, qs, sleep } from "./Utils";
import { Replay } from "./Replay/Replay";
import { PlaySetting } from "./BeforePlaying/PlaySettingSetter";
import { setInteractionEnabled } from "./Utilities/Element/InteractionElement";

/**
 * ResultPageに関する、状態を持たない関数群
 */
export class ResultPageHandler {
    private static readonly parser = new DOMParser();

    static setSaveButton() {
        const saveButton = qs("#result .saveReplayButton");
        let saving = false;
        // 初期化は新しい結果に対して一度だけ行う。詳細結果から戻った際は維持する。
        saveButton.innerText = "リプレイを保存する";
        setInteractionEnabled(saveButton, true);

        saveButton.onclick = async () => {
            if (saving) return;
            saving = true;
            setInteractionEnabled(saveButton, false);
            saveButton.innerText = "保存中……";

            await sleep(17);

            const succeed = await Replay.saveLastOne();
            if (succeed) {
                saveButton.innerText = "保存しました";
                saveButton.onclick = () => {};
            } else {
                saveButton.innerText = "リプレイを保存する";
                setInteractionEnabled(saveButton, true);
            }
            saving = false;
        };
    }

    static OverWriteTime(finishTime: number) {
        qsAll(".resultLabel").forEach((resultLabel) => {
            if (resultLabel.innerText.includes("Time")) {
                resultLabel.innerText = `Time : ${(finishTime / 1000).toFixed(2)}`;
            }
        });
    }

    static updateResultLabels(resultText: string) {
        qsAll(".resultLabel").forEach((resultLabel) => {
            resultLabel.textContent = resultText;
        });
    }

    //詳細結果の中身を作成する
    static updateDetailedResultPage({ players, playSetting }: { players: GamePlayer[]; playSetting: PlaySetting }) {
        // 前の結果を消す
        qsAll("#detailedResult .subPage").forEach((subPage) => {
            subPage.remove();
        });

        const subPageController = qs("#detailedResult .subPageController");

        const resultTitlePage = this.createResultTitlePage(players, playSetting);
        subPageController.before(resultTitlePage);

        players.forEach((player, index) => {
            const page = this.createPlayerResultPage(playSetting, player, index);
            subPageController.before(page);
        });
    }

    private static createResultTitlePage(players: GamePlayer[], playSetting: PlaySetting) {
        const html = `
            <div class="subPage">
                <div class="text">
                    Player人数 : ${players.length}<br />
                    モード : ${playSetting.mode == 1 ? "サバイバル" : "十五列揃え"}<br />
                    ${playSetting.mode == 1 ? `持ち時間 : ${this.formatValue(playSetting.maxGameTime)}<br />` : `クリア列数 : ${playSetting.targetLines}<br />`}
                    ${players.length != 1 ? `結果 : ${qs(".resultLabel").innerHTML}<br />` : ""}
                </div>
            </div>    
        `;

        return this.parser.parseFromString(html, "text/html").body.firstElementChild!;
    }

    private static createPlayerResultPage(playSetting: PlaySetting, p: GamePlayer, i: number) {
        const html = `
            <div class="subPage">
                <div class="text">
                    Player : ${i + 1}<br />
                    ${playSetting.mode === 1 ? `開始Time : ${this.formatValue(p.playInfo.maxGameTime)}<br />` : ""}
                    ${playSetting.mode === 1 ? `残りTime : ${this.formatValue(p.playInfo.gameTime)}<br />` : ""}
                    プレイ時間 : ${(p.playInfo.playTime / 1000).toFixed(2)}<br />
                    役の回数 : ${p.playInfo.trickCount}<br />
                    一列揃え : ${p.playInfo.line}<br />
                    最大Chain : ${p.playInfo.maxChain}<br />
                    Score : ${p.playInfo.score}<br />
                </div>
                <div class="text">
                    ${playSetting.mode === 1 ? `ペナルティ : ${p.playInfo.penalty}<br />` : ""}
                    ${playSetting.mode === 1 ? `回復 : ${p.playInfo.recovery}<br />` : ""}
                    ${playSetting.mode === 1 ? `余剰回復 : ${p.playInfo.surplus}<br />` : ""}
                    設置 : ${p.playInfo.put}<br />
                    ホールド : ${p.playInfo.hold}<br />
                    一手戻し : ${p.playInfo.unput}<br />
                    消去 : ${p.playInfo.remove}<br />
                </div>
                ${
                    playSetting.mode === 1
                        ? `<div class="text">
                            合計ダメージ : ${p.damageInfo.totalDamage}<br />
                            合計攻撃 : ${p.damageInfo.totalAttack}<br />
                            ハンデ : ×${p.playInfo.handy.toFixed(1)}<br />
                        </div>`
                        : ""
                }
            </div>
        `;

        return this.parser.parseFromString(html, "text/html").body.firstElementChild!;
    }

    private static formatValue(value: number): string {
        return value === Infinity ? "∞" : String(value);
    }
}
