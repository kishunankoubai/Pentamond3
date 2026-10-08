import { BlockKind } from "../BlockOperate/Block";

export type TrickLessonLayout = {
    trick: string;
    height: number;
    /** 初期盤面から置く順番。[種類, x, 底からの段数（0始まり）, 回転]。6種一巡の区切りを守る。 */
    solution: readonly (readonly [BlockKind, number, number, number])[];
};

/** 後半の自由なプレイには使用しない、組み方の一例。灰色の地形はあらかじめ置かない。 */
export const trickLessonLayouts: readonly TrickLessonLayout[] = [
    { trick: "一列揃え(上)", height: 1, solution: [["p",1,0,4],["U",3,1,2],["I",7,0,3],["q",15,0,2],["L",12,0,0]] },
    { trick: "地割れ(上)", height: 1, solution: [["I",2,0,0],["J",8,0,5],["p",10,0,0],["L",15,0,0]] },
    { trick: "地殻変動(上)", height: 1, solution: [["p",1,0,4],["L",3,0,1],["I",13,0,0],["q",15,1,4]] },
    { trick: "トゲトゲ(上)", height: 3, solution: [["J",1,1,4],["U",3,1,0],["p",6,1,2],["I",9,1,4],["L",15,1,2],["q",2,3,0],["L",13,1,2],["U",11,1,0]] },
    { trick: "トゲトゲ(下)", height: 1, solution: [["L",1,1,5],["U",3,1,3],["p",6,1,5],["I",13,1,1],["J",15,1,1],["q",4,2,0],["U",11,1,3],["L",9,1,5]] },
    { trick: "牙(上)", height: 3, solution: [["I",1,1,4],["p",3,1,5],["U",7,1,4],["J",9,1,0],["L",15,1,2],["q",13,1,1],["q",1,3,4],["J",5,3,1],["U",8,3,0],["L",11,3,5],["p",15,3,2]] },
    { trick: "三つ子山", height: 1, solution: [["J",1,1,4],["p",3,0,4],["I",8,0,0],["L",15,1,2],["q",13,0,2]] },
    { trick: "五人囃子", height: 1, solution: [["p",4,0,4],["U",0,1,2],["I",2,2,3],["L",5,2,2],["J",8,3,4],["q",10,3,5],["p",8,0,4],["J",11,1,5],["q",12,0,2],["U",16,1,4]] },
];
