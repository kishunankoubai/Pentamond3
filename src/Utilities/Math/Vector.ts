export class Vector {
    private values: number[];
    constructor(...values: number[] | number[][]) {
        if (values.length == 0) {
            throw new Error("0次元のベクトルは扱えません");
        }
        const validValues = Array.isArray(values[0]) ? values[0] : (values as number[]);
        if (validValues.filter((x) => Number.isNaN(x)).length != 0) {
            throw new Error("ベクトルにNaNが含まれています");
        }
        this.values = validValues;
    }

    /**
     * Vectorを表す配列
     */
    get g$array(): number[] {
        return this.values;
    }

    /**
     * ベクトルの次元
     */
    get g$length(): number {
        return this.values.length;
    }

    /**
     * ベクトルの大きさ
     */
    get g$size(): number {
        return Math.hypot(...this.values);
    }

    /**
     * 単位ベクトル
     */
    get g$unit(): Vector {
        if (this.g$isZero) {
            throw new Error("零ベクトルを単位ベクトルにすることはできません");
        }
        return this.multiple(1 / this.g$size);
    }

    /**
     * 零ベクトルか
     */
    get g$isZero(): boolean {
        return this.values.filter((x) => x != 0).length == 0;
    }

    /**
     * このベクトルのコピー
     */
    get g$copy(): Vector {
        return new Vector(this.values);
    }

    /**
     * 法線ベクトル(2次元の時のみ)
     */
    get g$normal(): Vector {
        if (this.g$length != 2) {
            throw new Error("2次元のときのみ法線ベクトルを取得できます");
        }
        const values = [this.values[1], -this.values[0]];
        return new Vector(values);
    }

    /**
     * 偏角(2次元の時のみ)
     */
    get g$argument(): number {
        if (this.g$length != 2) {
            throw new Error("2次元のときのみ偏角を取得できます");
        }
        return (Math.atan2(this.values[1], this.values[0]) + Math.PI * 2) % (Math.PI * 2);
    }

    /**
     * @param index 取得したい成分のindex
     * @returns index番目の成分
     */
    get(index: number): number {
        return this.values[index];
    }

    /**
     * 加法
     * @param v 足すベクトル
     * @returns 和
     */
    add(v: Vector): Vector {
        if (this.g$length != v.g$length) {
            throw new Error("次元が異なるベクトルです");
        }
        const values = this.values.map((x, i) => x + v.g$array[i]);
        return new Vector(values);
    }

    /**
     * 減法
     * @param v 引くベクトル
     * @returns 差
     */
    sub(v: Vector): Vector {
        if (this.g$length != v.g$length) {
            throw new Error("次元が異なるベクトルです");
        }
        const values = this.values.map((x, i) => x - v.g$array[i]);
        return new Vector(values);
    }

    /**
     * @param v 内積をとるベクトル
     * @returns 内積
     */
    dot(v: Vector): Vector {
        if (this.g$length != v.g$length) {
            throw new Error("次元が異なるベクトルです");
        }
        const values = this.values.map((x, i) => x * v.g$array[i]);
        return new Vector(values);
    }

    /**
     * @param c スカラー
     * @returns スカラー倍
     */
    multiple(c: number): Vector {
        if (Number.isNaN(c)) {
            console.error("NaNによるスカラー倍が実行されています");
            c = 1;
        }
        const values = this.values.map((x) => x * c);
        return new Vector(values);
    }

    /**
     * このベクトルが零ベクトルなら失敗する
     * @param size 変えたいサイズ
     * @returns 同じ方向で指定したサイズのベクトル
     */
    setSize(size: number) {
        return this.g$unit.multiple(size);
    }

    /**
     * @param v 外積をとるベクトル
     * @returns 外積
     */
    cross(v: Vector): Vector {
        if (this.g$length != v.g$length) {
            throw new Error("次元が異なるベクトルです");
        }
        if (this.g$length != 3) {
            throw new Error("外積は3次元のときのみ実装されています");
        }
        const values = [
            this.values[1] * v.g$array[2] - this.values[2] * v.g$array[1],
            this.values[2] * v.g$array[0] - this.values[0] * v.g$array[2],
            this.values[0] * v.g$array[1] - this.values[1] * v.g$array[0],
        ];
        return new Vector(values);
    }

    /**
     * 原点を中心に回転させる
     * @param radian 回転する角度(rad)
     * @returns 回転後のベクトル
     */
    rot(radian: number): Vector {
        if (this.g$length != 2) {
            throw new Error("回転は2次元のときのみ実装されています");
        }
        return new Vector(this.values[0] * Math.cos(radian) - this.values[1] * Math.sin(radian), this.values[0] * Math.sin(radian) + this.values[1] * Math.cos(radian));
    }

    /**
     * @param v 比較したいベクトル
     * @returns このベクトルと等しいか
     */
    equals(v: Vector): boolean {
        if (this.g$length != v.g$length) {
            return false;
        }
        let equal = true;
        this.values.forEach((x, i) => {
            if (x - v.get(i) != 0) {
                equal = false;
            }
        });
        return equal;
    }

    /**
     * 距離関数
     * @param v 比較したいベクトル
     * @returns このベクトルとの距離
     */
    getDistanceFrom(v: Vector) {
        if (this.g$length != v.g$length) {
            throw new Error("次元が異なるベクトルです");
        }
        return this.sub(v).g$size;
    }

    /**
     * このベクトルと最も近いベクトルを返す　複数ある場合はindexが最も若いものを返す
     * @param vectors 比較したいベクトルの配列
     * @returns 最も近いベクトル
     */
    getNearestVector(...vectors: Vector[] | Vector[][]) {
        if (vectors.length == 0) {
            throw new Error("長さ0の配列を渡されました");
        }
        const validVectors = Array.isArray(vectors[0]) ? vectors[0] : (vectors as Vector[]);
        let minDistance = Infinity;
        let index = 0;
        validVectors.forEach((v, i) => {
            const distance = v.getDistanceFrom(this);
            if (distance < minDistance) {
                minDistance = distance;
                index = i;
            }
        });
        return validVectors[index];
    }

    /**
     * このベクトルと最も遠いベクトルを返す　複数ある場合はindexが最も若いものを返す
     * @param vectors 比較したいベクトルの配列
     * @returns 最も遠いベクトル
     */
    getFarthestVector(...vectors: Vector[] | Vector[][]) {
        if (vectors.length == 0) {
            throw new Error("長さ0の配列を渡されました");
        }
        const validVectors = Array.isArray(vectors[0]) ? vectors[0] : (vectors as Vector[]);
        let maxDistance = 0;
        let index = 0;
        validVectors.forEach((v, i) => {
            const distance = v.getDistanceFrom(this);
            if (maxDistance < distance) {
                maxDistance = distance;
                index = i;
            }
        });
        return validVectors[index];
    }
}
