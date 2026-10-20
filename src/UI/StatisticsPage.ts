import { PlayStatistics } from "../Storage/PlayStatistics";
import type { PlayStatisticKey } from "../Storage/PlayStatistics";
import type { Scene } from "../Utilities/Scene/SceneManager";

export function setupStatisticsPage(scene: Scene): void {
    const render = () => {
        const data = PlayStatistics.getData();
        document.querySelectorAll<HTMLElement>("#information [data-statistic]").forEach((element) => {
            const value = data[element.dataset.statistic as PlayStatisticKey];
            element.textContent = element.dataset.format === "time" ? (value ? (value / 1000).toFixed(2) : "—") : value.toLocaleString("ja-JP");
        });
    };
    render();
    scene.g$pageManager.addHandler("changePage-information", render);
}
