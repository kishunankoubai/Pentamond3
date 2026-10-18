import type { NuisanceMondManager } from "./NuisanceMondManager";
import { MusicManager } from "../Utilities/Music/MusicManager";

/** 本編・リプレイ・教習で、破壊と地面への到達を別の音で知らせる。 */
export function bindDamageSounds(manager: NuisanceMondManager): void {
    manager.addHandler("destroyMond", () => MusicManager.get("ブロック破壊音")?.play());
    manager.addHandler("damageBoard", () => MusicManager.get("ダメージ音")?.play());
}
