import type { Tutorial2Board } from "./Board";
import type { TutorialControlMarkup } from "../TutorialTypes";

/** 基本ルールの説明文。教習の進行・盤面操作はSceneTutorialが担当する。 */
export function tutorial2Introduction(model: Tutorial2Board, controlMarkup: TutorialControlMarkup): string[] {
    const id = model.lesson.id;
    if (id === "chain")
        return [
            "Pentamondは、モンドを組み合わせて「役」を揃えるゲームです！ただ積むだけでなく、役の形を作ることが大切です。",
            "役は一列の、三角形の特定の並び方です。一番下の列を消したときにその列の形で役が判定されます。",
            "今回は3個のモンドを設置するとちょうど10個の役が完成します。",
        ];
    if (id === "variety") return ["一列揃え以外にもいろいろな役があります！空いている場所も形の一部なのですべて埋めればよいわけではありません。", ...tutorial2VarietyExplanation(model, controlMarkup)];
    if (id === "survival")
        return [
            "サバイバルでは持ち時間が少しずつ減り、0になると終了です。持ち時間は実時間の0.5秒ごとに1減ります。",
            "役を消去すると持ち時間が回復し、スコアも増えます。チェインではさらにスコアにボーナスがつきます！",
            "マルチプレイなら攻撃もできます。時間は設定された上限を超えて回復しません。",
            "今回は最大持ち時間30で、一列揃えを1回成立させましょう。",
            `黄色の枠にモンドを設置して${controlMarkup("removeLine")}で消去しましょう。`,
        ];
    if (id === "penalty")
        return [
            "一手戻しは便利ですが、サバイバルでは持ち時間が3減るペナルティを受けます。",
            "役なし消去は最初の1回にはペナルティがありません。ただし、続けて消すと1回につき持ち時間が3減ります。",
            "役を成立させると、役なし消去のペナルティ待ちはなくなります。設置でも1ずつ軽くなります。",
            "まずモンドを1個設置し、一手戻ししてみましょう。そのあと役なし消去のペナルティも体験します。",
        ];
    return [
        "マルチのサバイバルでは、役を消去してためた攻撃を次のモンドの設置で相手へ送ります。チェインでも攻撃が増えます。",
        "こちらに攻撃が届いていると設置時にこちらの攻撃と相殺します。それでも受けた攻撃が残っている場合、待機時間後の設置でダメージが始まります。",
        "ダメージでは灰色の「じゃまモンド」が落ちてきて地形のモンドを壊します。地面まで届くと持ち時間も1ずつ減ります。",
        `今回は待機を終えた攻撃12がある場面です。${controlMarkup("put")}で設置して、ダメージによる地形の変化を見てみましょう。`,
    ];
}

export function tutorial2VarietyExplanation(model: Tutorial2Board, controlMarkup: TutorialControlMarkup): string[] {
    if (model.tricks === 0) return ["まずは「三つ子山」。3つの山の間に空きがある形です。黄色の枠にモンドを設置しましょう。"];
    if (model.tricks === 1)
        return ["次は「トゲトゲ(下)」。下向きの三角形がひとつおきに並ぶ役です。", `回転と${controlMarkup("move-down")}での滑り移動を使って、黄色の枠に合うように設置しましょう。`];
    return ["最後は「地割れ(上)」。左右で三角形の向きが変わり、間に1か所の空きがあります。空きを残すことが大切です。", "黄色の枠にモンドを設置して、役を完成させましょう。"];
}

