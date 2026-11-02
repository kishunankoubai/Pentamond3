export const tutorial1Lessons = [
    { id: "move", name: "モンドの移動と設置", count: 5, knowledge: "左右で位置を合わせます。設置すると、真下の一番下まで自動で移動します。" },
    { id: "rotate", name: "回転", count: 5, knowledge: "1回で60度回転します。黄色の枠の形に注意しましょう" },
    { id: "slide", name: "滑り移動", count: 5, knowledge: "モンドが真下に進めないとき、下方向の入力で斜め下に移動できます。屋根の右側から穴に入れましょう。" },
    { id: "hold", name: "ホールド", count: 5, knowledge: "モンドを取っておくことができます。すでに持っていれば入れ替わります。" },
    { id: "undo", name: "一手戻し", count: 10, knowledge: "直前に設置したモンドを戻すことができます。消去すると一手戻しはできなくなります。" },
    { id: "erase", name: "消去", count: 3, knowledge: "一番下の列を消します。特定の形なら役が成立します。役のない列も消すことができます。" },
] as const;
export type Tutorial1LessonId = (typeof tutorial1Lessons)[number]["id"];
