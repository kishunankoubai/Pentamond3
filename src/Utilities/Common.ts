export function getConstructor<T extends object>(instance: T): new (...args: any[]) => T {
    return instance.constructor as new (...args: any[]) => T;
}

export function getMaxElements<T>(array: T[], callbackfn: (value: T, index: number, array: T[]) => number): T[] {
    let maxEvaluation = -Infinity;
    let maxElements: T[] = [];
    array.forEach((value, i, a) => {
        const evaluation = callbackfn(value, i, a);
        if (Number.isNaN(evaluation)) {
            throw Error("NaNが出現したため評価ができません");
        }
        if (maxEvaluation < evaluation) {
            maxElements = [value];
            maxEvaluation = evaluation;
        } else if (maxEvaluation === evaluation) {
            maxElements.push(value);
        }
    });
    return maxElements;
}

export function getFilteredArray<T>(array: T[], filterArray: T[]): T[] {
    return array.filter((value) => !filterArray.includes(value));
}

export function mod(dividend: number, divisor: number): number {
    return ((dividend % divisor) + divisor) % divisor;
}

export function nearestMod(dividend: number, divisor: number): number {
    const remainder = mod(dividend, divisor);
    if (Math.min(remainder, Math.abs(remainder - divisor)) == remainder) return remainder;
    else return remainder - divisor;
}

export function observe(callbackfn: () => boolean, maxTime: number = 3000) {
    return new Promise<void>((resolve, reject) => {
        const startTime = Date.now();
        let animationFrame: number;
        const loop = () => {
            if (callbackfn()) {
                cancelAnimationFrame(animationFrame);
                resolve();
                return;
            }
            if (Date.now() - startTime >= maxTime) {
                cancelAnimationFrame(animationFrame);
                reject();
                return;
            }
            animationFrame = requestAnimationFrame(loop);
        };
        loop();
    });
}

export function sleep(time: number): Promise<void> {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve();
        }, time);
    });
}
