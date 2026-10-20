import { GamePlayer } from "../Game/GamePlayer";
import { htmlQSAll, htmlQS } from "../Utilities/Element/Query";
import { sleep } from "../Utilities/Common";
import { Replay } from "../Replay/Replay";
import { PlaySetting } from "../BeforePlaying/PlaySettingSetter";
import { setInteractionEnabled } from "../Utilities/Element/InteractionElement";
import type { DisposableGame } from "../GameProcessing/DisposableGame";
import { achievements, achievementGrades } from "../Achievements/Definitions";
import { MusicManager } from "../Utilities/Music/MusicManager";
import { Achievements } from "../Achievements/Achievements";

/**
 * ResultPageに関する、状態を持たない関数群
 */
export class ResultPageHandler {
    private static readonly parser = new DOMParser();

    static setSaveButton(game: DisposableGame) {
        const saveButton = htmlQS("#result .saveReplayButton");
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

            const alreadyAchieved = Achievements.isAchieved("replay-saved");
            const succeed = await Replay.saveLastOne();
            if (succeed) {
                saveButton.innerText = "保存しました";
                saveButton.onclick = () => {};
                if (!alreadyAchieved && Achievements.isAchieved("replay-saved")) {
                    game.highlights.achievements.push("replay-saved");
                    this.updateHighlights(game, false);
                    this.updateDetailedResultPage(game);
                    MusicManager.get("実績達成")?.play();
                }
            } else {
                saveButton.innerText = "リプレイを保存する";
                setInteractionEnabled(saveButton, true);
            }
            saving = false;
        };
    }

    static updateReplayTime(finishTime: number) {
        htmlQSAll(".resultLabel").forEach((resultLabel) => {
            if (resultLabel.innerText.includes("Time")) {
                resultLabel.innerText = `Time : ${(finishTime / 1000).toFixed(2)}`;
            }
        });
    }

    static updateResultLabels(resultText: string) {
        htmlQSAll(".resultLabel").forEach((resultLabel) => {
            resultLabel.textContent = resultText;
        });
    }

    static updateHighlights(game: DisposableGame, playSound = true): void {
        const pageId = game.isReplay() ? "replayResult" : "result";
        const summary = document.querySelector<HTMLElement>(`#${pageId} .resultSummary`)!;
        const highlights = document.querySelector<HTMLElement>(`#${pageId} .resultHighlights`)!;
        summary.replaceChildren();
        highlights.replaceChildren();
        const maxChain = Math.max(...game.players.map((player) => player.playInfo.maxChain));
        const trickCount = game.players.reduce((sum, player) => sum + player.playInfo.trickCount, 0);
        const time = Math.max(...game.players.map((player) => player.playInfo.playTime));
        for (const [label, value] of [
            ["プレイ時間", (time / 1000).toFixed(2)],
            ["役成立", `${trickCount}回`],
            ["最大Chain", String(maxChain)],
        ]) {
            const cell = document.createElement("div");
            cell.className = "resultSummaryCell";
            const heading = document.createElement("span");
            heading.textContent = label;
            const content = document.createElement("span");
            content.textContent = value;
            cell.append(heading, content);
            summary.appendChild(cell);
        }
        if (game.isReplay()) return;
        game.highlights.records.slice(0, 2).forEach((text) => {
            const record = document.createElement("div");
            record.className = "recordBadge";
            record.textContent = text;
            highlights.appendChild(record);
        });
        if (game.highlights.achievements.length) {
            const earned = document.createElement("div");
            earned.className = "achievementEarned";
            const grades = new Set(game.highlights.achievements.map((id) => achievements.find((item) => item.id === id)?.grade));
            const highestGrade = (["gold", "silver", "bronze"] as const).find((grade) => grades.has(grade)) ?? "bronze";
            const triangle = document.createElement("span");
            triangle.className = `achievementTriangle ${highestGrade}`;
            triangle.setAttribute("aria-hidden", "true");
            const text = document.createElement("span");
            text.textContent = `実績達成！ ${game.highlights.achievements.length}個 ／ 詳細結果で確認できます`;
            earned.append(triangle, text);
            highlights.appendChild(earned);
        }
        if (playSound && (game.highlights.records.length || game.highlights.achievements.length)) MusicManager.get("実績達成")?.play();
    }

    //詳細結果の中身を作成する
    static updateDetailedResultPage({ players, playSetting, highlights }: { players: GamePlayer[]; playSetting: PlaySetting; highlights?: DisposableGame["highlights"] }) {
        // 前の結果を消す
        htmlQSAll("#detailedResult .subPage").forEach((subPage) => {
            subPage.remove();
        });

        const subPageController = htmlQS("#detailedResult .subPageController");

        const resultTitlePage = this.createResultTitlePage(players, playSetting);
        subPageController.before(resultTitlePage);

        if (highlights) {
            const lines = [
                ...highlights.records,
                ...highlights.achievements.map((id) => {
                    const item = achievements.find((achievement) => achievement.id === id)!;
                    return `${achievementGrades[item.grade]}：${item.description}`;
                }),
            ];
            for (let i = 0; i < lines.length; i += 5) {
                const page = document.createElement("div");
                page.className = "subPage resultAccomplishments";
                const heading = document.createElement("div");
                heading.className = "helpTopic";
                heading.textContent = "今回の成果";
                page.appendChild(heading);
                lines.slice(i, i + 5).forEach((text) => {
                    const row = document.createElement("div");
                    row.className = "text";
                    row.textContent = text;
                    page.appendChild(row);
                });
                subPageController.before(page);
            }
        }

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
                    ${playSetting.mode == 1 ? `初期最大持ち時間 : ${this.formatValue(playSetting.maxGameTime)}<br />` : `クリア列数 : ${playSetting.targetLines}<br />`}
                    ${players.length != 1 ? `結果 : ${htmlQS(".resultLabel").innerHTML}<br />` : ""}
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
                    ${playSetting.mode === 1 ? `最大持ち時間 : ${this.formatValue(p.playInfo.maxGameTime)}<br />` : ""}
                    ${playSetting.mode === 1 ? `持ち時間 : ${this.formatValue(p.playInfo.gameTime)}<br />` : ""}
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
        return value === Infinity ? '<span class="infinitySymbol">∞</span>' : String(value);
    }
}
