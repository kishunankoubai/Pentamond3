export const basicRuleLessons = [
    { id: "chain", name: "役とチェイン", count: 10, knowledge: "Pentamondは役を揃えるゲームです。最下列を消したときに役が判定され、役のある列を連続して消すとチェインが増えます。" },
    { id: "variety", name: "さまざまな役", count: 3, knowledge: "一列揃えだけが役ではありません。三角形の向きと、空けておく場所も役の形の一部です。" },
    { id: "survival", name: "サバイバル：持ち時間とスコア", count: 1, knowledge: "持ち時間が0になると終了です。役を消すと時間が回復し、スコアが増えます。マルチでは攻撃もたまります。" },
    { id: "penalty", name: "サバイバル：ペナルティ", count: 3, knowledge: "一手戻しは持ち時間を3減らします。役なし消去は最初の1回は減らず、続けて消すと3減ります。" },
    { id: "damage", name: "マルチ：攻撃とダメージ", count: 1, knowledge: "役でためた攻撃は次の設置で送られ、受けた攻撃と相殺します。待機時間後の設置でダメージが始まります。" },
] as const;
