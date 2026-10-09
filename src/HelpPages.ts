import { damageWaitingTime, defaultMaxGameTime, gameTimeRate, penalty } from "./Settings";
import { spaceJapanesePunctuation } from "./Utilities/Text/JapaneseText";

type HelpSection = { title: string; paragraphs: string[] };
type HelpDocument = { id: string; sections: HelpSection[] };

export function getModeHelpPageId(mode: number, players: number): string {
    return `${players === 1 ? "solo" : "multi"}${mode === 1 ? "Survival" : "Line"}Help`;
}

const basicSections: HelpSection[] = [
    {
        title: "Pentamondは、 役を揃えるゲームです！",
        paragraphs: [
            "三角形のあつまりを積み上げて、 決まった形を作るゲームです。 この三角形のあつまりを「モンド」、 決まった形を「役」といいます。",
            "ただ積み上げるだけではなく、 役を揃えて消すことが大事です。 まずは、 基本的な遊び方を見ていきましょう！",
        ],
    },
    {
        title: "モンドを動かしてみよう！",
        paragraphs: [
            "盤面の上に出現したモンドは、 左右に動かしたり回転させたりできます。",
            "下に動かすこともできます。 真下に進めないときに斜め下へ動くことを、 「滑り移動」といいます。",
            "動かすだけでは設置されません。 どこに置くかを決めてから、 設置しましょう。",
        ],
    },
    {
        title: "ゴーストを目印に設置しよう！",
        paragraphs: [
            "操作しているモンドの下に表示される影を、 「ゴースト」といいます。 設置すると、 このゴーストの位置まで動いて置かれます。",
            "設置すると次のモンドが出現します。 動かして設置して、 また次を動かして……と繰り返すことで、 自由に積み上げられます。",
            "ゴーストを見ながら、 置きたい場所に合っているか確かめましょう。",
        ],
    },
    {
        title: "役を揃えよう！",
        paragraphs: [
            "モンドで役を揃えると、 スコアが貰えたり、 持ち時間が回復したり……いいことがたくさんあります。 マルチのサバイバルでは相手に攻撃もできます。",
            "役は一列ごとの形で判定されます。 まずは最も基本的な役、 「一列揃え」を目指してみましょう。",
            "どんな役があるかは、 その他→ヘルプ→役一覧で確認できます。 いろいろな役を揃えてみましょう！",
        ],
    },
    {
        title: "揃えた役を消去しよう！",
        paragraphs: [
            "消去すると、 盤面の一番下の列が消えます。 形を揃えただけでは役は成立せず、 その列を消去して初めて成立します。",
            "役のある列を連続して消去すると、 「チェイン」になります。 サバイバルではスコアや攻撃にボーナスが付きます。",
            "何列かまとめて役を揃えて、 一気に消すと高いスコアを目指せます。 ただし、 途中で設置するとチェインが途切れるので注意しましょう。",
        ],
    },
    {
        title: "持ち時間に気を付けよう！",
        paragraphs: [
            "サバイバルには持ち時間があり、 0になるとゲームオーバーです。 役を揃えて消去すると、 持ち時間を回復できます。",
            "役のない列も消せますが、 役なし消去を繰り返すと持ち時間が減ってしまいます。 一手戻しにもペナルティがあるので、 使いどころには気を付けましょう。",
            "十五列揃えには持ち時間の制限はありません。 遊び方の違いは、 ヘルプの「モード説明」で確認できます。",
        ],
    },
    {
        title: "さっそく遊んでみよう！",
        paragraphs: [
            "まとめると、 モンドを動かして役を揃え、 それを消去するゲームです。 きれいな形を作れるようになると、 もっと楽しくなりますね！",
            "詳しい仕組みやちょっとしたテクニックは「応用編」、 キーやボタンを思い出したいときは「操作方法」をご覧ください。",
            "実際に体験しながら覚えたい場合は、 タイトルの「養成所」から教習を受けられます。",
        ],
    },
];

const advancedSections: HelpSection[] = [
    {
        title: "ネクスト",
        paragraphs: [
            "盤面の横のNEXTには、 これから出現するモンドが順番に表示されます。",
            "モンドは全6種類です。 6種類が一巡するごとに、 次の一巡の順番が決まります。",
            "今のモンドだけでなく、 次のモンドも使えるように地形を整えていきましょう。",
        ],
    },
    {
        title: "ホールド",
        paragraphs: [
            "今は使いにくいモンドを、 HOLDに取っておくことができます。 初めてのホールドでは次のモンドが出現します。",
            "すでにHOLDにモンドがある場合は、 操作中のモンドと入れ替わります。 ホールドは何回でも使えます。",
            "入れ替えたモンドは初期位置に出現します。 HOLDにモンドがある状態で2回ホールドすると、 下に動かしたモンドを初期位置に戻せます。",
        ],
    },
    {
        title: "一手戻し",
        paragraphs: [
            "直前に設置したモンドを取り消して、 もう一度置き直せます。 戻せるのは一手だけです。",
            `サバイバルでは、 一手戻しのたびに持ち時間が${penalty.unput}減ります。 列を消去した後は、 消去前の設置には戻せません。`,
            "設置 → ホールド → 一手戻し → ホールドの順に操作すると、 次のネクストを取り出せます。 今のモンドとHOLDのどちらも使いにくいときの手段ですが、 一手戻しのペナルティには注意しましょう。",
        ],
    },
    {
        title: "入り組んだ地形への置き方",
        paragraphs: [
            "モンドが移動できるかどうかは、 移動先で地形や壁に重ならないかで決まります。",
            "一見入らないように見えても、 途中の移動先が空いていれば入ることがあります。 下移動や滑り移動を試してみましょう。",
            "地形によっては、 滑り移動の後に回転することで隙間に入れられます。 設置する前に形と位置を確認しましょう。",
        ],
    },
    {
        title: "モンドが出現しないとき",
        paragraphs: [
            "初期位置が地形で埋まっていると、 次のモンドが出現できなくなります。",
            "この状態では、 列の消去と一手戻し以外のモンド操作はできません。 出現位置が空くと、 再びモンドを操作できます。",
            "上まで積みすぎる前に列を消去して、 出現位置を空けておきましょう。",
        ],
    },
    {
        title: "攻撃のタイミング",
        paragraphs: [
            "マルチのサバイバルでは、 役のある列を消去すると攻撃がたまります。 その後の設置で、 自分以外のプレイヤーへ送られます。",
            "複数の役を連続で消去すると、 チェインによってスコアや攻撃量にボーナスが付きます。",
            `攻撃を受けると盤面の枠が黄色く点滅します。 ${damageWaitingTime / 1000}秒後に赤く点滅し、 その後の設置でダメージ処理が始まります。`,
        ],
    },
    {
        title: "ダメージと相殺",
        paragraphs: [
            "ダメージ処理では、 じゃまモンドが上から降ってきて地形を壊します。",
            "地形を壊さずに一番下まで落ちたじゃまモンドは、 持ち時間を1減らします。",
            "ダメージ処理が始まる前に役を消去して攻撃をためると、 次の設置時に受ける攻撃と相殺できます。 相殺で使わなかった分の攻撃は相手へ送られます。",
        ],
    },
    {
        title: "滑り移動は左優先",
        paragraphs: [
            "下移動で真下に進めないとき、 斜め下が空いていれば滑り移動できます。",
            "左右の両方へ滑れるときは、 左側が優先されます。 片方にしか滑れないときは、 そちらへ移動します。",
            "右へ滑りたいときは、 真下にも左斜め下にも進めない地形であることを確認しましょう。",
        ],
    },
];

function survivalSections(multi: boolean): HelpSection[] {
    return [
        {
            title: multi ? "役を揃えて、 最後まで生き残ろう！" : "役を揃えて、 スコアを伸ばそう！",
            paragraphs: [
                multi
                    ? "持ち時間が0になると脱落します。 最後まで生き残ったプレイヤーが勝者です。"
                    : "持ち時間がなくなるまで役を作り続けるスコアアタックです。 高いスコアと長いプレイ時間を目指しましょう。",
                "一番下の列に役を作り、 消去すると持ち時間が回復してスコアが増えます。 役のある列を続けて消去するとチェインになります。",
                multi
                    ? "役の消去で攻撃がたまり、 次の設置で相手に送られます。 自分への攻撃は、 ためた攻撃で相殺できます。"
                    : "まとめて役を消去すると、 チェインによってさらに高いスコアを得られます。",
                `一手戻しでは持ち時間が${penalty.unput}減ります。 役なし消去を繰り返すと、 持ち時間が${penalty.removeLine}ずつ減るので注意しましょう。`,
            ],
        },
        {
            title: "プレイ設定と記録",
            paragraphs: [
                `持ち時間の初期値は${defaultMaxGameTime}です。 ${gameTimeRate / 1000}秒ごとに1減り、 回復しても設定した持ち時間を超えません。`,
                "プレイ準備の「プレイ設定」で持ち時間と各プレイヤーのハンデを変更できます。 ハンデは回復量と攻撃量の倍率で、 初期値は1です。",
                "持ち時間を無限にすると、 時間切れにならずに練習できます。 終了するときはポーズ画面から戻れます。",
                multi
                    ? `プレイ後のスコアや攻撃量は詳細結果で確認できます。 情報ページの最高スコアは、 持ち時間${defaultMaxGameTime}のプレイだけが対象です。`
                    : `プレイ後のスコアや時間は詳細結果で確認できます。 情報ページの最高スコア・最長プレイ時間は、 持ち時間${defaultMaxGameTime}のプレイだけが対象です。`,
            ],
        },
    ];
}

function lineSections(multi: boolean): HelpSection[] {
    return [
        {
            title: multi ? "相手より速く、 一列揃えを消去しよう！" : "一列揃えのタイムアタック！",
            paragraphs: [
                "一列揃え(上)または一列揃え(下)を15回成立させるまでのタイムを競います。 揃えるだけでなく、 列を消去すると回数に数えられます。",
                multi
                    ? "全員が同時にスタートし、 最初に目標の列数を消去したプレイヤーが勝者です。"
                    : "持ち時間の制限はありません。 できるだけ短いタイムでのクリアを目指しましょう。",
                "一列揃え以外の役を消去しても、 目標の列数には数えられません。",
                "このモードには攻撃も、 一手戻し・役なし消去による持ち時間のペナルティもありません。",
            ],
        },
        {
            title: "クリア列数と記録",
            paragraphs: [
                "プレイ準備の「プレイ設定」で、 クリアまでの列数を1～30列に変更できます。 初期値は15列です。",
                "サバイバルの持ち時間やハンデの設定は、 このモードには影響しません。",
                "クリアタイムと揃えた列数は、 プレイ後の詳細結果やリプレイで確認できます。",
                "情報ページの最速タイムは、 15列設定でクリアしたプレイだけが対象です。",
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
