import { MyEvent, MyEventListener } from "../Utilities/MyEventListener";
import { GamePlayer } from "./GamePlayer";

export const gameEvents: MyEvent[] = [];
export type OperateName = "put" | "move-left" | "move-right" | "move-down" | "spin-left" | "spin-right" | "unput" | "hold" | "removeLine";
export type OperateData = {
    time: number;
    operateName: OperateName;
};

export abstract class GameMode extends MyEventListener {
    protected players: GamePlayer[] = [];
    protected state = {
        hasFinished: false,
    };
    protected winners: GamePlayer[] = [];
    operateMemories: OperateData[][];
    constructor(players: GamePlayer[]) {
        super();
        this.players = players;
        this.operateMemories = new Array(players.length).fill(undefined).map(() => []);
        const operateNames = ["put", "move-left", "move-right", "move-down", "spin-left", "spin-right", "unput", "hold", "removeLine"];
        players.forEach((p, i) => {
            operateNames.forEach((operateName) => {
                gameEvents.push(
                    p.operator.addHandler(operateName, () => {
                        this.operateMemories[i].push({
                            time: Math.floor(p.loop.g$elapsedTime),
                            operateName: operateName as OperateName,
                        });
                    })
                );
            });
        });
    }
    get g$hasFinished() {
        return this.state.hasFinished;
    }
    get g$isPlaying() {
        return this.players.some((player) => !player.loop.g$isStopping);
    }

    abstract start(): void;
    abstract stop(): void;
    protected abstract proceedPlayerFinish(): void;
    protected abstract addPlayerBehavior(index: number): void;

    remove() {
        gameEvents.splice(0).forEach((event) => event.owner?.removeEvent(event));
        this.removeAllEvent();
        this.players.forEach((player) => {
            player.g$element.remove();
        });
    }
}
