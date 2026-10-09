import type { Scene } from "../Utilities/SceneManager";
import type { ElementManager } from "../Utilities/Element/ElementManager";
import { spaceJapanesePunctuation } from "../Utilities/Text/JapaneseText";
import { Achievements } from "./Achievements";
import { achievements, achievementCategories, achievementGrades, type Achievement } from "./Definitions";

export function setupAchievementPage(scene: Scene, elements: ElementManager): void {
    const page = document.getElementById("achievements")!;
    const detail = page.querySelector<HTMLElement>(".achievementDetail")!;
    const total = page.querySelector<HTMLElement>("#achievementTotal")!;
    const title = page.querySelector<HTMLElement>("#achievementDescription")!;
    const state = page.querySelector<HTMLElement>("#achievementState")!;
    const note = page.querySelector<HTMLElement>("#achievementNote")!;
    const summaryOverall = page.querySelector<HTMLElement>("#achievementSummaryOverall")!;
    const summaryGrades = page.querySelector<HTMLElement>(".achievementSummaryGrades")!;
    const gradeRows = (["gold", "silver", "bronze"] as const).map((grade) => {
        const row = document.createElement("div");
        row.className = `achievementSummaryRow ${grade}`;
        const triangle = document.createElement("span");
        triangle.className = "achievementTriangle";
        triangle.setAttribute("aria-hidden", "true");
        const label = document.createElement("span");
        label.textContent = achievementGrades[grade];
        const count = document.createElement("span");
        const percentage = document.createElement("span");
        row.append(triangle, label, count, percentage);
        summaryGrades.appendChild(row);
        return { grade, count, percentage };
    });
    const buttons = new Map<HTMLElement, Achievement>();
    const perPage = 12;
    for (const category of ["general", "survival", "sprint"] as const) {
        const items = achievements.filter((achievement) => achievement.category === category);
        const pages = Math.ceil(items.length / perPage);
        for (let part = 0; part < pages; part++) {
            const section = document.createElement("div");
            section.className = "subPage achievementSection";
            const heading = document.createElement("div");
            heading.className = "achievementCategory";
            heading.textContent = achievementCategories[category] + (pages > 1 ? ` (${part + 1} / ${pages})` : "");
            const grid = document.createElement("div");
            grid.className = "achievementGrid";
            items.slice(part * perPage, (part + 1) * perPage).forEach((achievement, index) => {
                const button = document.createElement("div");
                button.className = `button achievementIcon ${achievement.grade}`;
                button.dataset.xy = `[${index % 6},${Math.floor(index / 6)}]`;
                button.dataset.achievement = achievement.id;
                button.setAttribute("aria-describedby", "achievementNote");
                const triangle = document.createElement("span");
                triangle.className = "achievementTriangle";
                triangle.setAttribute("aria-hidden", "true");
                button.appendChild(triangle);
                buttons.set(button, achievement);
                grid.appendChild(button);
            });
            section.append(heading, grid);
            page.insertBefore(section, detail);
        }
    }

    const show = (achievement: Achievement) => {
        title.textContent = spaceJapanesePunctuation(achievement.description);
        state.textContent = `${achievementGrades[achievement.grade]}　${Achievements.isAchieved(achievement.id) ? "達成済み" : "未達成"}`;
        note.textContent = spaceJapanesePunctuation(achievement.note);
    };
    const showFirst = () => {
        const section = Array.from(page.querySelectorAll<HTMLElement>(".subPage")).find((element) => element.style.display !== "none");
        detail.style.display = section?.classList.contains("achievementSummary") ? "none" : "";
        const first = section?.querySelector<HTMLElement>(".achievementIcon");
        if (first) show(buttons.get(first)!);
    };
    const render = () => {
        let count = 0;
        buttons.forEach((achievement, button) => {
            const achieved = Achievements.isAchieved(achievement.id);
            count += Number(achieved);
            button.classList.toggle("unachieved", !achieved);
            button.setAttribute("aria-label", `${achievementGrades[achievement.grade]}・${achievement.description}（${achieved ? "達成済み" : "未達成"}）`);
        });
        total.textContent = `達成済み ${count} / ${achievements.length}`;
        const summary = Achievements.getSummary();
        summaryOverall.textContent = `合計 ${summary.achieved} / ${summary.total} 個　${summary.percentage.toFixed(1)}%`;
        gradeRows.forEach(({ grade, count, percentage }) => {
            const result = summary.grades[grade];
            count.textContent = `${result.total}個中 ${result.achieved}個`;
            percentage.textContent = `${result.percentage.toFixed(1)}%`;
        });
        showFirst();
    };
    const events = new AbortController();
    const onSelect = (event: Event) => {
        const button = event.target instanceof Element ? event.target.closest<HTMLElement>(".achievementIcon") : null;
        const achievement = button && buttons.get(button);
        if (achievement) show(achievement);
    };
    page.addEventListener("focusin", onSelect, { signal: events.signal });
    page.addEventListener("click", onSelect, { signal: events.signal });
    scene.addHandler("sceneEnd", () => events.abort(), 1);
    scene.g$pageManager.addHandler("changePage-achievements", render);
    elements.addHandler("openSubPage-achievements", showFirst);
    render();
}
