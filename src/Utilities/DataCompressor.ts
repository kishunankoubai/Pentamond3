export class DataCompressor {
    /**
     * @param data 圧縮する整数列
     * @param key 各要素の基数
     * 各data[i]は0からkey[i]-1の整数を取りうると解釈し、UTF-16文字列に圧縮する
     */
    static compressArray(data: number[], key: number[]): string {
        let bits: number[] = [];
        for (let i = 0; i < data.length; i++) {
            const value = data[i];
            const base = key[i];
            const bitLength = Math.ceil(Math.log2(base));
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
    static decompressArray(compressed: string, key: number[]): number[] {
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
            const bitLength = Math.ceil(Math.log2(base));

            let value = 0;

            for (let j = 0; j < bitLength; j++) {
                value = (value << 1) | bits[bitIndex++];
            }

            result.push(value);
        }

        return result;
    }
}
