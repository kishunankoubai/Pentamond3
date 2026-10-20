import { damageWaitingTime, defaultMaxGameTime, gameTimeRate, maxGameTimeScoreInterval, minimumMaxGameTime, penalty } from "../Config/GameConfig";
import { spaceJapanesePunctuation } from "../Utilities/Text/JapaneseText";

type HelpSection = { title: string; paragraphs: string[] };
type HelpDocument = { id: string; sections: HelpSection[] };

export function getModeHelpPageId(mode: number, players: number): string {
    return `${players === 1 ? "solo" : "multi"}${mode === 1 ? "Survival" : "Line"}Help`;
}

const basicSections: HelpSection[] = [
    {
        title: "Pentamondは役を揃えるゲームです！",
        paragraphs: [
            "Pentamond（ペンタモンド）は三角形のあつまりを操作し、 積み上げて決まった形を作るゲームです。 この三角形のあつまりを「モンド」、 決まった形を「役」といいます。",
            "ただ積み上げるだけではなく、 役を揃えて消すことが大事です。 まずは基本的な遊び方を見ていきましょう！",
        ],
    },
    {
        title: "モンドを動かしてみよう！",
        paragraphs: [
            "盤面の上に出現したモンドは、 左右に動かしたり回転させたりできます。",
            "下に動かすこともでき、 真下に進めないときに斜め下へ動きます。 これを「滑り移動」といいます。",
            "ただし、動かすだけでは設置されません。 ",
        ],
    },
    {
        title: "ゴーストを目印に設置しよう！",
        paragraphs: [
            "操作しているモンドの下に表示される影を、 「ゴースト」といいます。 設置するとこのゴーストの位置に置かれます。",
            "設置すると次のモンドが出現します。 動かして設置して、 また次を動かして……と繰り返すことで自由に積み上げることができます。",
        ],
    },
    {
        title: "役を揃えよう！",
        paragraphs: [
            "役を揃えるとスコアが貰えたり、 持ち時間が回復したり……いいことがたくさんあります。 マルチのサバイバルでは相手に攻撃もできます。",
            "役は一列ごとの形で判定されます。 まずは最も基本的な役、 「一列揃え」を目指してみましょう。",
            "どんな役があるかは、 その他→ヘルプ→役一覧で確認できます。 慣れてきたらいろいろな役を揃えてみましょう！",
        ],
    },
    {
        title: "揃えた役を消去しよう！",
        paragraphs: [
            "「消去」すると盤面の一番下の列が消えます。役の形を揃えるだけでなく、 その列を消去して初めて役として成立します。",
            "役のある列を連続して消去すると「チェイン」になります。 サバイバルではスコアや攻撃にボーナスが付きます。",
            "何列かまとめて役を揃えて一気に消すとより高いスコアを目指せます。 ただし、 途中で設置するとチェインが途切れるので注意しましょう。",
        ],
    },
    {
        title: "持ち時間に気を付けよう！",
        paragraphs: [
            "サバイバルの残り時間を「持ち時間」、 その上限を「最大持ち時間」といいます。 持ち時間が0になるとゲームオーバーです。 役を成立させると回復できます。",
            "役のない列も消せますが、 役なし消去を繰り返すと持ち時間が減ってしまいます。 使いどころには気を付けましょう。",
            "十五列揃えには持ち時間の制限はありません。 詳しい違いはヘルプの「モード説明」で確認できます。",
        ],
    },
    {
        title: "さっそく遊んでみよう！",
        paragraphs: [
            "まとめると、 Pentamondはモンドを動かして役を揃え、 それを消去するゲームです。 きれいな形を作れるようになるともっと楽しくなりますね！",
            "詳しい仕組みやちょっとしたテクニックは「応用編」、 キーやボタンを確認したいときは「操作方法」をご覧ください。",
            "実際に操作しながら覚えたい場合は、 メインメニューの「養成所」から教習を受けられます。",
        ],
    },
];

const advancedSections: HelpSection[] = [
    {
        title: "ネクスト",
        paragraphs: [
            "盤面の横のNEXTと書かれている部分にはこれから出現するモンドが順番に表示されます。",
            "モンドは全6種類です。 出現順は6種類が毎回一巡するようになっています。",
            "今のモンドだけでなく次のモンドも視野にいれて地形を整えていきましょう。",
        ],
    },
    {
        title: "ホールド",
        paragraphs: [
            "今操作しているモンドをHOLDと書かれている場所に取っておくことができます。 これを「ホールド」といいます。",
            "すでにHOLDにモンドがある状態でホールドすると、 操作中のモンドと入れ替わります。 ホールドは何回でも使えます。",
            "入れ替えたモンドは初期位置に出現します。 つまり2回ホールドすることで下に動かしたモンドを初期位置に戻せたりします。",
        ],
    },
    {
        title: "一手戻し",
        paragraphs: [
            "直前に設置したモンドを取り消してもう一度置き直すことができます。 これを「一手戻し」といいます。戻せるのは一手だけです。",
            `サバイバルでは一手戻しのたびに持ち時間が${penalty.unput}減ります。 なお、列を消去した直後は一手戻しできません。`,
            "今操作しているモンドもHOLDも都合が悪いとき、設置 → ホールド → 一手戻し → ホールドの順に操作するといいことがあるかも？",
        ],
    },
    {
        title: "入り組んだ地形への置き方",
        paragraphs: [
            "モンドが移動できるかどうかは移動先が空いているかのみで決まります。",
            "一見入らないように見えても、 移動先が空いてさえいれば入れることができます。 下移動や滑り移動を試してみましょう。",
            "地形によっては滑り移動の後に回転すると入ることがあるかも？",
        ],
    },
    {
        title: "モンドが出現しないとき",
        paragraphs: [
            "初期位置が地形で埋まっていると次のモンドが出現できなくなります。",
            "この状態では、 消去と一手戻し以外の操作はできません。 出現位置が空くと再びモンドが出現します。",
            "積みすぎには注意しましょう。",
        ],
    },
    {
        title: "攻撃のタイミング",
        paragraphs: [
            "マルチのサバイバルでは、 役の消去で攻撃をため、 次の設置で生存する相手に等分して送ります。 （端数は切り上げ）",
            "複数の役を連続で消去するとチェインによってスコアや攻撃量にボーナスが付きます。",
            `攻撃を受けると盤面の枠が黄色く点滅します。 ${damageWaitingTime / 1000}秒後に赤く点滅し、 その後の設置でダメージ処理が始まります。`,
        ],
    },
    {
        title: "ダメージと相殺",
        paragraphs: [
            "ダメージ処理では「じゃまモンド」というトゲが上から降ってきて地形を壊します。",
            "地形を壊さずに一番下まで落ちたじゃまモンドは、 持ち時間を1減らします。",
            "ダメージ処理が始まる前に役を揃えることで次の設置時に受けるダメージと攻撃を相殺できます。",
            "役を消去して攻撃するか、消去せずに防御に使うか……。 腕の見せ所です。",
        ],
    },
    {
        title: "滑り移動は左優先",
        paragraphs: [
            "下移動で真下に進めないとき、 斜め下が空いていれば滑り移動できます。",
            "ただし、 左右の両方へ滑れるときは左側が優先されます。 左優先の法則です。",
            "右へ滑りたいときは真下にも左斜め下にも進めない地形であることを確認しましょう。",
        ],
    },
];

function survivalSections(multi: boolean): HelpSection[] {
    return [
        {
            title: multi ? "役を揃えて、 最後まで生き残ろう！" : "役を揃えて、 ハイスコアを目指そう！",
            paragraphs: [
                multi
                    ? "持ち時間が0になると脱落します。 最後まで生き残ったプレイヤーが勝者です。"
                    : "持ち時間がなくなるまで役を作り続けるスコアアタックです。 高いスコアと長いプレイ時間を目指しましょう。",
                "一番下の列に役を作り消去すると持ち時間が回復してスコアが増えます。 役のある列を続けて消去するとチェインになります。",
                multi ? "役の消去で攻撃ができ、 次の設置で生存する相手に等分して送ります。 自分への攻撃は相殺できます。" : "まとめて役を消去するとチェインによってさらに高いスコアを得られます。",
                `一手戻しでは持ち時間が${penalty.unput}、役なし消去を繰り返すと持ち時間が${penalty.removeLine}ずつ減るので注意しましょう。`,
            ],
        },
        {
            title: "プレイ設定と記録",
            paragraphs: [
                `最大持ち時間の初期設定は${defaultMaxGameTime}です。 持ち時間は${gameTimeRate / 1000}秒ごとに1減り、 回復しても最大持ち時間を超えません。`,
                "最大持ち時間が無限なら時間切れになりません。 ポーズ画面からメニューなどに戻れます。",
                multi
                    ? "プレイ設定で最大持ち時間とハンデを変更できます。 ハンデは回復・攻撃の倍率で、 初期値は1です。"
                    : "プレイ設定で最大持ち時間とハンデを変更できます。 ハンデは回復量の倍率で、 初期値は1です。",
                multi
                    ? `最高スコア・最大攻撃は、 初期最大持ち時間${defaultMaxGameTime}・ハンデ1が記録対象です。`
                    : `最高スコア・最長プレイ時間は、 初期最大持ち時間${defaultMaxGameTime}・ハンデ1が記録対象です。`,
            ],
        },
        {
            title: "最大持ち時間の減少",
            paragraphs: [
                `スコアが伸びると最大持ち時間が少しずつ減ります。 ${multi ? "開始時の全参加者の平均スコア" : "自分のスコア"}が${maxGameTimeScoreInterval}増えるごとに1減り、 下限は${minimumMaxGameTime}です。`,
                ...(multi ? ["脱落したプレイヤーのスコアも勘定されます。"] : []),
                "最大持ち時間が無限の場合はこの減少は起こりません。",
            ],
        },
    ];
}

function lineSections(multi: boolean): HelpSection[] {
    return [
        {
            title: multi ? "相手より速く一列揃えを作ろう！" : "一列揃えのタイムアタック！",
            paragraphs: [
                "一列揃え(上)または一列揃え(下)を15回成立させるまでのタイムを競います。",
                multi ? "全員が同時にスタートし、 最初に目標の列数を消去したプレイヤーが勝者です。" : "持ち時間の制限はありません。 できるだけ短いタイムでのクリアを目指しましょう。",
                "このモードでは一列揃え以外の役を成立しません。",
                "このモードには攻撃も一手戻し・役なし消去による持ち時間のペナルティもありません。",
            ],
        },
        {
            title: "クリア列数と記録",
            paragraphs: [
                "プレイ準備の「プレイ設定」からクリアまでの列数を1～30列に変更できます。 初期値は15列です。",
                "サバイバルの最大持ち時間やハンデの設定はこのモードには影響しません。",
                "情報ページの最速タイムは15列設定でクリアしたプレイだけが記録されます。",
            ],
        },
    ];
}

/** 内容だけを生成し、ページ遷移・ページ送り・入力は既存のUtilitiesに任せる。 */
export function setupHelpPages(): void {
    const documents: HelpDocument[] = [
        { id: "howToPlayBasic", sections: basicSections },
        { id: "howToPlayAdvanced", sections: advancedSections },
        { id: "soloSurvivalHelp", sections: survivalSections(false) },
        { id: "multiSurvivalHelp", sections: survivalSections(true) },
        { id: "soloLineHelp", sections: lineSections(false) },
        { id: "multiLineHelp", sections: lineSections(true) },
    ];
    documents.forEach(({ id, sections }) => {
        const page = document.getElementById(id)!;
        sections.forEach(({ title, paragraphs }) => {
            const section = document.createElement("div");
            section.className = "subPage helpContent";
            const heading = document.createElement("div");
            heading.className = "helpTopic";
            heading.textContent = spaceJapanesePunctuation(title);
            section.appendChild(heading);
            paragraphs.forEach((text) => {
                const paragraph = document.createElement("div");
                paragraph.className = "text";
                paragraph.textContent = spaceJapanesePunctuation(text);
                section.appendChild(paragraph);
            });
            page.insertBefore(section, page.querySelector(".subPageController"));
        });
    });
}
