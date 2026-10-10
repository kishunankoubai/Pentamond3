/** 標準Gamepadの入力は、配置が分かる名前を設定と案内で共用する。 */
export function formatControllerInput(input: string): string {
    const names: Record<string, string> = {
        "button:0": "丸下ボタン", "button:1": "丸右ボタン", "button:2": "丸左ボタン", "button:3": "丸上ボタン",
        "button:4": "L1", "button:5": "R1", "button:6": "L2", "button:7": "R2",
        "button:8": "中央左ボタン", "button:9": "中央右ボタン",
        "button:12": "方向キー上", "button:13": "方向キー下", "button:14": "方向キー左", "button:15": "方向キー右",
        "stick:-0": "左スティック左", "stick:+0": "左スティック右", "stick:-1": "左スティック上", "stick:+1": "左スティック下",
        "stick:-2": "右スティック左", "stick:+2": "右スティック右", "stick:-3": "右スティック上", "stick:+3": "右スティック下",
    };
    if (names[input]) return names[input];
    const button = input.match(/^button:(\d+)$/);
    if (button) return `ボタン${button[1]}`;
    const stick = input.match(/^stick:([+-])(\d+)$/);
    if (stick) return `スティック${stick[2]}${stick[1] === "+" ? "＋" : "－"}`;
    return input;
}
