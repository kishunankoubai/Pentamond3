// import { gameManager } from "./Run";

// function sleepGame(ms: number): Promise<void> {
//     if (!gameManager) {
//         return sleep(ms);
//     }
//     return new Promise((resolve) => {
//         const sleepStartTime = gameManager.g$elapsedTime;
//         const eventId = gameManager.addEvent(["gameLoop"], () => {
//             if (sleepStartTime + ms <= gameManager.g$elapsedTime) {
//                 resolve();
//                 EventManager.removeEvent(eventId);
//             }
//         });
//     });
// }

/**
 * 簡易的スリープ
 * @param ms 処理を止めるミリ秒数
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function printDotToVertices(left: number, top: number, color?: string) {
    const printDots = document.getElementsByClassName("printDot");
    if (printDots.length >= 100) {
        [...printDots].forEach((element) => {
            element.remove();
        });
    }
    const dot = document.createElement("div");
    dot.className = "printDot";
    dot.style.width = "8px";
    dot.style.height = "8px";
    dot.style.position = "absolute";
    dot.style.top = top - 1 + "px";
    dot.style.left = left - 1 + "px";
    dot.style.backgroundColor = color || "#ff0000";
    let dotZIndex = 100;
    dot.style.zIndex = dotZIndex + "";
    document.querySelector("#play")!.appendChild(dot);
}

/**
 * 画面上の指定した座標に点を表示する(デバッグ用)
 * @param left 画面左端からの距離(px)
 * @param top 画面上端からの距離(px)
 * @param color 点の色
 */
function printDot(left: number, top: number, color?: string) {
    const printDots = document.getElementsByClassName("printDot");
    if (printDots.length >= 100) {
        [...printDots].forEach((element) => {
            element.remove();
        });
    }
    const dot = document.createElement("div");
    dot.className = "printDot";
    dot.style.width = "5px";
    dot.style.height = "5px";
    dot.style.position = "absolute";
    dot.style.top = top - 1 + "px";
    dot.style.left = left - 1 + "px";
    dot.style.backgroundColor = color || "#ff0000";
    let dotZIndex = 100;
    dot.style.zIndex = dotZIndex + "";
    document.body.appendChild(dot);
}

/**
 * 配列の中身を混ぜる
 * @param array 混ぜる配列
 */
function mixArray(array: any[]) {
    const mixCount = (array.length * Math.log(array.length)) / 2;
    let a, b;
    let i, j;
    for (let k = 0; k < mixCount; k++) {
        i = Math.floor(Math.random() * array.length);
        j = Math.floor(Math.random() * array.length);
        a = array[i];
        b = array[j];
        array[i] = b;
        array[j] = a;
    }
}

/**
 * document.querySelectorAllのHTMLElement限定の略記
 * @param selector セレクタ
 * @returns 指定したHTMLElementの配列
 */
function qsAll(selector: string): HTMLElement[] {
    return Array.from(document.querySelectorAll(selector)) as HTMLElement[];
}

/**
 * document.querySelectorのHTMLElement限定の略記
 * @param selector セレクタ
 * @returns 指定したHTMLElement
 */
function qs(selector: string): HTMLElement {
    return document.querySelector(selector) as HTMLElement;
}

/**
 * HTMLElementにイベントを追加する
 * @param selector セレクタ
 * @param eventName イベントの名前
 * @param handler クリック時に行う処理
 */
function qsAddEvent(selector: string, eventName: string, handler: (element: HTMLElement) => any) {
    qsAll(selector).forEach((element) => {
        element.addEventListener(eventName, () => {
            handler(element);
        });
    });
}

function debounce(fn: Function, delay: number) {
    let timeout: number | undefined;
    return () => {
        clearTimeout(timeout);
        timeout = setTimeout(fn, delay);
    };
}

function arrayPlus(a: number[], b: number[]): number[] {
    if (a.length <= b.length) {
        return a.map((n, i) => n + b[i]);
    } else {
        return b.map((n, i) => n + a[i]);
    }
}

function getMinElement(array: { element: any; value: number }[]) {
    if (array.length == 0) {
        return null;
    }
    let minValue = Infinity;
    let result: any = null;
    array.forEach(({ element, value }) => {
        if (value < minValue) {
            minValue = value;
            result = element;
        }
    });
    return result;
}

/**
 * ポインターを一時的に隠す。動かしたら表示する。
 */
function removeMousePointerTemporary() {
    if (document.body.style.cursor != "none") {
        document.body.style.cursor = "none";
        window.addEventListener(
            "mousemove",
            () => {
                document.body.style.cursor = "";
            },
            { once: true }
        );
    }
}

export { sleep, printDotToVertices as printDot, mixArray, qsAll, qs, qsAddEvent, debounce, arrayPlus, getMinElement, removeMousePointerTemporary };
