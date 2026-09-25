import { LoopManager } from "./Utilities/Loop/LoopManager";
import { qs } from "./Utils";
import { Vector } from "./Vector";

export function setupPlayBackground() {
    const element = qs("#playBackground");

    colorAnimation = element.animate(
        [
            {
                backgroundColor: "#88aaee",
            },
            {
                backgroundColor: "#aa88ee",
            },
            {
                backgroundColor: "#aaeeaa",
            },
            {
                backgroundColor: "#eeeeaa",
            },
            {
                backgroundColor: "#88aaee",
            },
        ],
        {
            duration: 25000,
            direction: "normal",
            iterations: Infinity,
        }
    );
    element.appendChild(canvas);
}

let colorAnimation: Animation | null;

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d")!;

canvas.width = 14 * 40;
canvas.height = 9 * 40;

class Triangle {
    x: number = 0;
    y: number = 0;
    size: number = 0;
    speed: number = 0;
    opacity: number = 0;
    angle: number = 0;
    rotationSpeed: number = 0;
    constructor() {
        this.reset();
    }

    reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + 20;
        this.size = 20 + Math.random() ** 1.2 * 40;
        this.speed = 0.6 + Math.random() * 1.5;
        this.opacity = 0.2 + Math.random() * 0.5;
        this.angle = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.04;
    }

    update() {
        this.y -= this.speed;
        this.angle += this.rotationSpeed;
        if (this.y < -this.size) {
            this.reset();
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        const point = new Vector(this.x, this.y);
        const vertex = new Vector(0, (-this.size / 2) * (Math.sqrt(3) / 2)).rot(this.angle);
        ctx.beginPath();
        ctx.moveTo(...(vertex.rot(0).add(point).array as [number, number]));
        ctx.lineTo(...(vertex.rot((2 * Math.PI) / 3).add(point).array as [number, number]));
        ctx.lineTo(...(vertex.rot((4 * Math.PI) / 3).add(point).array as [number, number]));
        ctx.closePath();

        ctx.fillStyle = `rgba(255,255,255,${this.opacity})`;
        ctx.fill();
    }
}

const triangles = Array.from({ length: 40 }, () => new Triangle());
const playBackgroundLoop = new LoopManager();
playBackgroundLoop.addHandler("loop", () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    triangles.forEach((tri) => {
        tri.update();
        tri.draw(ctx);
    });
});
playBackgroundLoop.s$onTime = false;

export const playBackground = {
    reset: () => {
        if (!colorAnimation) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        triangles.forEach((tri) => {
            tri.reset();
        });
        playBackgroundLoop.reset();
        colorAnimation.cancel();
    },
    start: () => {
        if (!colorAnimation) return;
        playBackgroundLoop.start();
        if (colorAnimation.playState != "running") colorAnimation.play();
    },
    stop: () => {
        if (!colorAnimation) return;
        playBackgroundLoop.stop();
        colorAnimation.pause();
    },
};
