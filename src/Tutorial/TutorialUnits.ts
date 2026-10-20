import { tutorial1Lessons } from "./Tutorial1/Lessons";
import { tutorial2Lessons } from "./Tutorial2/Lessons";
import { tutorial3LessonOffset, tutorial3Lessons } from "./Tutorial3/Lessons";
import { tutorial4LessonOffset, tutorial4Lessons } from "./Tutorial4/Lessons";

/**
 * Tutorial1～4を表示順に定義し、一覧・見出し・戻り先・解放判定を一元化する。
 * 単元IDと項目順は、保存済みのクリア状態・実績との対応を維持する。
 */
export const tutorialUnits = [
    {
        id: "operation",
        name: "操作方法",
        page: "operateTutorial",
        list: "operationLessonList",
        offset: 0,
        lessons: tutorial1Lessons,
        perPage: tutorial1Lessons.length,
        requiredAchievements: 0,
        //
    },
    {
        id: "basic",
        name: "基本ルール",
        page: "basicRuleTutorial",
        list: "basicRuleLessonList",
        offset: tutorial1Lessons.length,
        lessons: tutorial2Lessons,
        perPage: tutorial2Lessons.length,
        requiredAchievements: 0,
        //
    },
    {
        id: "advanced",
        name: "応用など",
        page: "advancedRule",
        list: "advancedLessonList",
        offset: tutorial3LessonOffset,
        lessons: tutorial3Lessons,
        perPage: tutorial3Lessons.length,
        requiredAchievements: 3,
        //
    },
    {
        id: "trick",
        name: "役の揃え方",
        page: "trickTutorial",
        list: "trickLessonList",
        offset: tutorial4LessonOffset,
        lessons: tutorial4Lessons,
        perPage: 4,
        requiredAchievements: 5,
        //
    },
] as const;

export const tutorialLessonCount = tutorialUnits.reduce((count, unit) => count + unit.lessons.length, 0);
export function getTutorialUnit(index: number): (typeof tutorialUnits)[number] {
    const unit = tutorialUnits.find((unit) => index >= unit.offset && index < unit.offset + unit.lessons.length);
    if (!unit || !Number.isInteger(index)) throw new Error("教習項目が存在しません");
    return unit;
}
