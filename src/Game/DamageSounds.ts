import type { NuisanceMondManager } from "./NuisanceMondManager";
import { MusicManager } from "../Utilities/Music/MusicManager";

export function bindDamageSounds(manager: NuisanceMondManager): void {
    manager.addHandler("destroyMond", () => MusicManager.get("ブロック破壊音")?.play());
    manager.addHandler("damageBoard", () => MusicManager.get("ダメージ音")?.play());
}
