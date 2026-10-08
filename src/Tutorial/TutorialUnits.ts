import { operationLessons } from "./OperationLessons";
import { basicRuleLessons } from "./BasicRuleLessons";
import { advancedLessonOffset, advancedLessons } from "./AdvancedLessons";
import { trickLessonOffset, trickLessons } from "./TrickLessons";

/** 保存済みの項目番号を維持し、一覧・見出し・戻り先・解放判定を一元化する。 */
export const tutorialUnits = [
    { id: "operation", name: "操作方法", page: "operateTutorial", list: "operationLessonList", offset: 0, lessons: operationLessons, perPage: operationLessons.length },
    { id: "basic", name: "基本ルール", page: "BasicRule", list: "basicRuleLessonList", offset: operationLessons.length, lessons: basicRuleLessons, perPage: basicRuleLessons.length },
    { id: "advanced", name: "応用など", page: "advancedRule", list: "advancedLessonList", offset: advancedLessonOffset, lessons: advancedLessons, perPage: advancedLessons.length },
    { id: "trick", name: "役の揃え方", page: "trickTutorial", list: "trickLessonList", offset: trickLessonOffset, lessons: trickLessons, perPage: 4 },
] as const;

export const tutorialLessonCount = tutorialUnits.reduce((count, unit) => count + unit.lessons.length, 0);
export function getTutorialUnit(index: number): typeof tutorialUnits[number] {
    const unit = tutorialUnits.find((unit) => index >= unit.offset && index < unit.offset + unit.lessons.length);
    if (!unit || !Number.isInteger(index)) throw new Error("教習項目が存在しません");
    return unit;
}
