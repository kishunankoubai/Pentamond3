/** 要素ごとに既知の値域を指定し、固定長のビット列をUTF-16の符号単位へ詰める。 */
export class DataCompressor {
    private static bitWidths(radices: readonly number[]): number[] {
        return radices.map((radix) => {
            if (!Number.isInteger(radix) || radix < 1 || radix > 0x100000000) throw new Error("基数は1以上2^32以下の整数にしてください");
            return Math.ceil(Math.log2(radix));
        });
    }
    /**
     * @param data 圧縮する整数列
     * @param key 各要素の基数
     * 各data[i]は0からkey[i]-1の整数を取りうると解釈し、UTF-16文字列に圧縮する
     */
    static compressArray(data: readonly number[], key: readonly number[]): string {
        if (data.length !== key.length) throw new Error("データと基数の項目数が一致しません");
        const widths = this.bitWidths(key);
        const bits: number[] = [];
        for (let i = 0; i < data.length; i++) {
            const value = data[i];
            const base = key[i];
            if (!Number.isInteger(value) || value < 0 || value >= base) throw new Error("整数が指定した値域を超えています");
            const bitLength = widths[i];
            for (let j = bitLength - 1; j >= 0; j--) {
                bits.push((value >> j) & 1);
            }
        }
        while (bits.length % 16 !== 0) {
            bits.push(0);
        }
        let result = "";
        for (let i = 0; i < bits.length; i += 16) {
            let code = 0;
            for (let j = 0; j < 16; j++) {
                code |= bits[i + j] << (15 - j);
            }
            result += String.fromCharCode(code);
        }
        return result;
    }

    /**
     * @param compressed compressArrayで生成された文字列
     * @param key 各要素の基数
     * @returns 復元された整数列
     *
     * compressArrayで圧縮した文字列を解凍する
     */
    static decompressArray(compressed: string, key: readonly number[]): number[] {
        const widths = this.bitWidths(key);
        const bitCount = widths.reduce((sum, width) => sum + width, 0);
        if (typeof compressed !== "string" || compressed.length !== Math.ceil(bitCount / 16)) throw new Error("圧縮データの長さが不正です");
        const bits: number[] = [];

        for (let i = 0; i < compressed.length; i++) {
            const code = compressed.charCodeAt(i);

            for (let j = 15; j >= 0; j--) {
                bits.push((code >> j) & 1);
            }
        }

        const result: number[] = [];
        let bitIndex = 0;

        for (let i = 0; i < key.length; i++) {
            const base = key[i];
            const bitLength = widths[i];

            let value = 0;

            for (let j = 0; j < bitLength; j++) {
                // ビット演算で符号付き32bitへ変換しない（2^31以上も扱う）。
                value = value * 2 + bits[bitIndex++];
            }
            if (value >= base) throw new Error("圧縮データが指定した値域を超えています");
            result.push(value);
        }
        if (bits.slice(bitCount).some((bit) => bit !== 0)) throw new Error("圧縮データの末尾が不正です");
        return result;
    }
}
