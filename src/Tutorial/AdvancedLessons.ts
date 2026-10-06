import { operationLessons } from "./OperationLessons";
import { basicRuleLessons } from "./BasicRuleLessons";

export const advancedLessonOffset = operationLessons.length + basicRuleLessons.length;
export const advancedLessons = [
    { id: "next", name: "ネクスト", count: 4, knowledge: "NEXTには、これから出現するモンドが順番に表示されます。次の形も見ながら置き場所を考えましょう。" },
    { id: "holdReset", name: "ホールド2回で元の位置に", count: 1, knowledge: "上へ移動する操作はありません。ホールドにモンドがあれば、2回入れ替えることで今のモンドを初期位置・初期の向きに戻せます。" },
    { id: "juggling", name: "ジャグリング", count: 1, knowledge: "設置 → ホールド → 一手戻し → ホールドで、ネクストのモンドを取り出せます。サバイバルでは一手戻しのペナルティがあるため、使いどころを考えましょう。" },
    { id: "rotation", name: "回転入れ", count: 2, knowledge: "真下へ設置するだけでは入らない場所でも、滑り移動のあとに回転すると入ることがあります。白枠の形と向きに合わせましょう。" },
    { id: "leftPriority", name: "左優先の法則", count: 1, knowledge: "下方向の入力では、真下、左下、右下の順に試します。真下が塞がれ、左右どちらにも滑れる場合は左が優先されます。" },
    { id: "blockedSpawn", name: "初期位置が埋まった場合", count: 2, knowledge: "初期位置に出現できない間は、移動・回転・設置・ホールドができません。一手戻しか消去で、出現できる場所を作りましょう。" },
] as const;
