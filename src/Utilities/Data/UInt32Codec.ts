/** 非負32bit整数を可変長(7bit単位)で格納し、保存に安全なBase64へ変換する。 */
export class UInt32Codec {
    static readonly max = 0xffffffff;

    static encode(values: readonly number[]): string {
        const bytes: number[] = [];
        for (let value of values) {
            if (!Number.isInteger(value) || value < 0 || value > this.max) throw new Error("32bit整数ではありません");
            do {
                const payload = value % 128;
                value = Math.floor(value / 128);
                bytes.push(payload + (value ? 128 : 0));
            } while (value);
        }
        return btoa(String.fromCharCode(...bytes));
    }

    static decode(encoded: string, maxCount: number): number[] {
        if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) throw new Error("整数データの形式が不正です");
        if (encoded.length > Math.ceil(maxCount * 5 / 3) * 4) throw new Error("整数データが大きすぎます");
        const bytes = atob(encoded);
        const result: number[] = [];
        let value = 0;
        let multiplier = 1;
        let length = 0;
        for (let i = 0; i < bytes.length; i++) {
            const byte = bytes.charCodeAt(i);
            value += (byte & 127) * multiplier;
            length++;
            if (length > 5 || value > this.max) throw new Error("整数データが32bitを超えています");
            if (byte < 128) {
                result.push(value);
                if (result.length > maxCount) throw new Error("整数データの項目数が不正です");
                value = 0;
                multiplier = 1;
                length = 0;
            } else multiplier *= 128;
        }
        if (length || this.encode(result) !== encoded) throw new Error("整数データが破損しています");
        return result;
    }
}
