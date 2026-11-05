import type { BlockProperty } from "../BlockOperate/Block";
import { TrickInfo, trickInfos } from "./Tricks";

const tricksByShape = new Map(trickInfos.map((trick) => [trick.shape.flat().join(), trick]));

export function isLineTrick(trick: TrickInfo | null): boolean {
    return trick?.name === "一列揃え(上)" || trick?.name === "一列揃え(下)";
}

/** 下からの消去順に役を返す　空行・役なしの列はnull */
export function* boardTricks(properties: BlockProperty[][]): Generator<TrickInfo | null> {
    for (let y = (properties[0]?.length ?? 0) - 1; y >= 0; y--) {
        const shape = properties
            .map((column) => {
                const [, direction, visible] = column[y];
                return [direction || !visible, visible];
            })
            .flat()
            .join();
        yield tricksByShape.get(shape) ?? null;
    }
}
