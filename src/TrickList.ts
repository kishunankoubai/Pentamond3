import { CanvasManager } from "./CanvasManager";
import { TrickInfo, trickInfos } from "./Trick";
import { ElementManager } from "./Utilities/Element/ElementManager";
import { EventScope } from "./Utilities/EventScope";
import { LoopManager } from "./Utilities/Loop/LoopManager";

/** 役の名称・形・基本値の出典はゲーム本体の定義に統一する。 */
export function setupTrickList(elementManager: ElementManager): void {
    const page = document.getElementById("trickList");
    const controller = page?.querySelector(".subPageController");
    if (!page || !controller) return;
    page.querySelectorAll(".subPage").forEach((element) => element.remove());
    const groups = new Map<string, TrickInfo[]>();
    trickInfos.forEach((trick) => {
        // 同名でも基本値が異なる役は別の項目として扱う。
        const key = JSON.stringify([trick.name, trick.time, trick.attack]);
        const variants = groups.get(key) ?? [];
        variants.push(trick);
        groups.set(key, variants);
    });
    const entries = Array.from(groups.values()).map((variants, index) => {
        const trick = variants[0];
        const subPage = document.createElement("div");
        subPage.className = "subPage trickListPage";
        subPage.style.display = index === 0 ? "" : "none";
        controller.before(subPage);
        const card = document.createElement("div");
        card.className = "trickCard";
        const name = document.createElement("div");
        name.className = "trickName";
        name.textContent = trick.name;
        const values = document.createElement("div");
        values.className = "trickValues";
        for (const [label, value] of [["回復", trick.time], ["攻撃", trick.attack]] as const) {
            const item = document.createElement("span");
            item.textContent = `${label}：${value}`;
            values.appendChild(item);
        }
        const canvas = CanvasManager.createRowCanvas(trick.shape);
        canvas.className = "trickCanvas";
        canvas.setAttribute("role", "img");
        canvas.setAttribute("aria-label", `${name.textContent}の形（高さ1の盤面）`);
        card.append(name, canvas, values);
        subPage.appendChild(card);
        return { subPage, canvas, variants };
    });

    const loop = new LoopManager();
    loop.s$loopFrequency = 800;
    loop.s$onTime = false;
    let activeEntry: typeof entries[number] | undefined;
    let variantIndex = 0;
    const paintVariant = () => {
        if (!activeEntry) return;
        const trick = activeEntry.variants[variantIndex];
        CanvasManager.paintRowCanvas(activeEntry.canvas, trick.shape);
        activeEntry.canvas.setAttribute("aria-label", `${trick.name}の形（高さ1の盤面、パターン${variantIndex + 1}/${activeEntry.variants.length}）`);
    };
    loop.addHandler("loop", () => {
        if (!activeEntry) return;
        variantIndex = (variantIndex + 1) % activeEntry.variants.length;
        paintVariant();
    });
    const startCurrentSubPage = () => {
        loop.reset();
        activeEntry = undefined;
        if (elementManager.g$scene.g$pageManager.g$currentPageId !== page.id) return;
        activeEntry = entries.find(({ subPage }) => subPage.style.display !== "none");
        variantIndex = 0;
        paintVariant();
        if (activeEntry && activeEntry.variants.length > 1) loop.start();
    };
    const events = new EventScope();
    events.add(
        elementManager.g$scene.g$pageManager.addHandler("changePage", startCurrentSubPage),
        elementManager.addHandler(`openSubPage-${page.id}`, startCurrentSubPage)
    );
    elementManager.g$scene.addHandler("sceneEnd", () => {
        loop.reset();
        activeEntry = undefined;
        events.dispose();
    }, 1);
}
