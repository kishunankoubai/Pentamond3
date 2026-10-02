import { MyEventListener } from "../Utilities/MyEventListener";
import { EventScope } from "../Utilities/EventScope";
import { GamePlayer } from "./GamePlayer";
import { operationKeyCodes } from "./Operations";

export type OperateName = "put" | "move-left" | "move-right" | "move-down" | "spin-left" | "spin-right" | "unput" | "hold" | "removeLine";
export type OperateData = {
    time: number;
    operateName: OperateName;
};

export abstract class GameMode extends MyEventListener {
    protected readonly events = new EventScope();
    protected players: GamePlayer[] = [];
    protected state = {
        hasFinished: false,
    };
    protected winners: GamePlayer[] = [];
    protected resultText = "";
    operateMemories: OperateData[][];
    constructor(players: GamePlayer[]) {
        super();
        this.players = players;
        this.operateMemories = new Array(players.length).fill(undefined).map(() => []);
        const operateNames = Object.keys(operationKeyCodes) as OperateName[];
        players.forEach((p, i) => {
            operateNames.forEach((operateName) => {
                this.events.add(
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
    get g$resultText() {
        return this.resultText;
    }

    abstract start(): void;
    abstract stop(): void;
    protected abstract proceedPlayerFinish(): void;
    protected abstract addPlayerBehavior(index: number): void;

    remove() {
        this.events.dispose();
        this.removeAllEvent();
        this.players.forEach((player) => {
            player.dispose();
        });
    }
}

export type GameModeClass = new (players: GamePlayer[]) => GameMode;
