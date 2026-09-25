export type Color = string & { __brand: "Color" };
export function color(color: `#${string}`) {
    return color as Color;
}
