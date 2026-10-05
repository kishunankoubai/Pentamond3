import { PlayStatistics } from "./PlayStatistics";
import type { PlayStatisticKey } from "./PlayStatistics";
import type { Scene } from "./Utilities/SceneManager";

export function setupStatisticsPage(scene: Scene): void {
    const render = () => {
        const data = PlayStatistics.getData();
        document.querySelectorAll<HTMLElement>("#information [data-statistic]").forEach((element) => {
            const value = data[element.dataset.statistic as PlayStatisticKey];
            element.textContent = element.dataset.format === "time"
                ? (value ? `${(value / 1000).toFixed(3)} 秒` : "—")
                : value.toLocaleString("ja-JP");
        });
    };
    render();
    scene.g$pageManager.addHandler("changePage-information", render);
}
