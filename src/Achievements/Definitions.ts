export const achievementTricks = ["一列揃え", "地割れ", "地殻変動", "トゲトゲ(上)", "トゲトゲ(下)", "牙", "三つ子山", "五人囃子"] as const;

/** 上下・地割れの形違いはまとめ、トゲトゲだけ上下を別種類にする。 */
export function achievementTrickIndex(name: string): number {
    return achievementTricks.findIndex((trick) => (trick.startsWith("トゲトゲ") ? name === trick : name === trick || name.startsWith(`${trick}(`)));
}

export type AchievementGrade = "bronze" | "silver" | "gold";
export type AchievementCategory = "general" | "survival" | "sprint";
export type Achievement = {
    id: string;
    category: AchievementCategory;
    grade: AchievementGrade;
    description: string;
    note: string;
    counter?: number;
    target?: number;
};

export const achievementGrades = { bronze: "銅", silver: "銀", gold: "金" } as const;
export const achievementCategories = { general: "全体", survival: "サバイバル", sprint: "十五列揃え" } as const;
export const survivalCountIndex = achievementTricks.length;
export const sprintCountIndex = survivalCountIndex + 1;
export const achievementCounterCount = sprintCountIndex + 1;
const completedNote = "完了した通常プレイが対象です。 養成所では加算されません。";
const sprintNote = "15列設定でクリアした通常プレイが対象です。";

// 保存するビットの番号なので、追加は末尾へ。既存の順番を変更しない。
export const achievements: readonly Achievement[] = [
    ...(
        [
            ["operation", "操作方法", "bronze"],
            ["basic", "基本ルール", "bronze"],
            ["advanced", "応用など", "bronze"],
            ["trick", "役の揃え方", "silver"],
        ] as const
    ).map(([unit, name, grade]) => ({
        id: `tutorial-${unit}`,
        category: "general" as const,
        grade,
        description: `養成所の「${name}」を修了しよう`,
        note: "単元内の教習項目をすべてクリアすると達成です。",
    })),
    { id: "tutorial-all", category: "general", grade: "gold", description: "養成所のすべての教習項目を終了しよう", note: "4つの単元の教習項目をすべてクリアすると達成です。" },
    { id: "replay-saved", category: "general", grade: "bronze", description: "リプレイを保存しよう", note: "リザルトや直近のリプレイから保存できます。 保存に成功すると達成です。" },
    ...(
        [
            [1, "bronze"],
            [10, "bronze"],
            [100, "silver"],
            [1000, "silver"],
            [10000, "gold"],
        ] as const
    ).map(([target, grade]) => ({
        id: `trick-0-${target}`,
        category: "general" as const,
        grade,
        description: target === 1 ? "一列揃えを作ろう" : `一列揃えを${target}回作ろう`,
        note: `一列揃え(上)と一列揃え(下)の成立回数を合計します。 ${completedNote}`,
        counter: 0,
        target,
    })),
    ...achievementTricks.slice(1).flatMap((trick, i) =>
        (
            [
                [1, "bronze"],
                [10, "silver"],
                [100, "gold"],
            ] as const
        ).map(([target, grade]) => ({
            id: `trick-${i + 1}-${target}`,
            category: "general" as const,
            grade,
            description: target === 1 ? `${trick}を作ろう` : `${trick}を${target}回作ろう`,
            note: `${["地割れ", "地殻変動", "牙"].includes(trick) ? "上下や形違いは同じ役として合計します。 " : ""}${completedNote}`,
            counter: i + 1,
            target,
        }))
    ),
    { id: "tricks-all", category: "general", grade: "silver", description: "役を全種類作ろう", note: `今回の実績にある8種類を成立させると達成です。 ${completedNote}` },
    ...(
        [
            [1, "bronze"],
            [10, "silver"],
            [100, "gold"],
        ] as const
    ).map(([target, grade]) => ({
        id: `survival-play-${target}`,
        category: "survival" as const,
        grade,
        description: target === 1 ? "サバイバルをプレイしよう" : `サバイバルを${target}回プレイしよう`,
        note: "完了した通常プレイを1ゲームにつき1回数えます。 ソロ・マルチのどちらでも達成できます。",
        counter: survivalCountIndex,
        target,
    })),
    ...(
        [
            [2, "bronze"],
            [3, "bronze"],
            [5, "silver"],
            [10, "gold"],
        ] as const
    ).map(([minutes, grade]) => ({
        id: `survival-time-${minutes}`,
        category: "survival" as const,
        grade,
        description: `${minutes}分以上生存しよう`,
        note: "持ち時間150で完了した通常プレイが対象です。 時間は実際のプレイ時間で判定します。",
        target: minutes * 60000,
    })),
    ...(
        [
            [10000, "silver"],
            [100000, "silver"],
            [1000000, "gold"],
        ] as const
    ).map(([target, grade]) => ({
        id: `survival-score-${target}`,
        category: "survival" as const,
        grade,
        description: `スコア${target}を達成しよう`,
        note: "サバイバルの1プレイのスコアで判定します。 持ち時間の設定は問いません。",
        target,
    })),
    {
        id: "survival-tricks-all",
        category: "survival",
        grade: "gold",
        description: "1プレイで役を全種類作ろう",
        note: `サバイバルの1プレイで、 同じプレイヤーが次の8種類を成立させよう：${achievementTricks.join("、 ")}。`,
    },
    ...(
        [
            [1, "bronze"],
            [10, "silver"],
            [100, "gold"],
        ] as const
    ).map(([target, grade]) => ({
        id: `sprint-play-${target}`,
        category: "sprint" as const,
        grade,
        description: target === 1 ? "十五列揃えをプレイしよう" : `十五列揃えを${target}回プレイしよう`,
        note: "完了した通常プレイを1ゲームにつき1回数えます。 クリア列数の設定は問いません。",
        counter: sprintCountIndex,
        target,
    })),
    {
        id: "sprint-no-hold",
        category: "sprint",
        grade: "gold",
        description: "ホールドを使用せずに15回の消去で十五列揃えをクリアしよう",
        note: `${sprintNote} ホールドは0回、 役なし消去なども含めて消去はちょうど15回です。`,
    },
    { id: "sprint-51-puts", category: "sprint", grade: "gold", description: "十五列揃えをちょうど51個の設置でクリアしよう", note: `${sprintNote} 一手戻しで取り消した設置は数えません。` },
    ...(
        [
            [1000, "bronze"],
            [600, "bronze"],
            [300, "silver"],
            [180, "silver"],
            [120, "gold"],
            [100, "gold"],
        ] as const
    ).map(([seconds, grade]) => ({
        id: `sprint-time-${seconds}`,
        category: "sprint" as const,
        grade,
        description: `十五列揃えを${seconds}秒以内にクリアしよう`,
        note: sprintNote,
        target: seconds * 1000,
    })),
];
