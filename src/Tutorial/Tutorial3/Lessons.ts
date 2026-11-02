import { tutorial1Lessons } from "../Tutorial1/Lessons";
import { tutorial2Lessons } from "../Tutorial2/Lessons";

export const tutorial3LessonOffset = tutorial1Lessons.length + tutorial2Lessons.length;
export const tutorial3Lessons = [
    { id: "next", name: "ネクスト", count: 4, knowledge: "NEXTにはこれから出現するモンドが順番に表示されます。次の形も見ながら置き場所を考えましょう。" },
    { id: "holdReset", name: "ホールド2回で元の位置に", count: 1, knowledge: "上へ移動する操作はありません。ホールドにモンドがあれば2回ホールドで今のモンドを初期位置に戻せます。" },
    {
        id: "juggling",
        name: "ジャグリング",
        count: 1,
        knowledge: "設置 → ホールド → 一手戻し → ホールドでネクストのモンドを取り出せます。サバイバルでは一手戻しのペナルティがあるため使いどころを考えましょう。",
    },
    { id: "rotation", name: "回転入れ", count: 2, knowledge: "真下へ設置するだけでは入らない場所でも滑り移動のあとに回転すると入ることがあります。黄色の枠の形と向きに合わせましょう。" },
    { id: "leftPriority", name: "左優先の法則", count: 1, knowledge: "下方向の入力では真下に移動できない際に左右のどちらかに滑ります。左右どちらにも滑れる場合は左が優先されます。" },
    { id: "blockedSpawn", name: "初期位置が埋まった場合", count: 2, knowledge: "初期位置に出現できない間は移動・回転・設置・ホールドができません。一手戻しか消去で出現できる場所を作りましょう。" },
] as const;
