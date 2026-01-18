declare module '@3d-dice/dice-box' {
    export interface DiceBoxConfig {
        container: string | HTMLElement;
        assetPath?: string;
        theme?: string;
        themeColor?: string;
        scale?: number;
        enableShadows?: boolean;
        offscreen?: boolean;
        gravity?: number;
        angularDamping?: number;
        linearDamping?: number;
        spinForce?: number;
        throwForce?: number;
        startingHeight?: number;
        settleTimeout?: number;
    }

    export interface Die {
        value: number;
        [key: string]: any;
    }

    export interface RollGroup {
        rolls?: Die[];
        value?: number;
        [key: string]: any;
    }

    export default class DiceBox {
        constructor(config: DiceBoxConfig);
        init(): Promise<void>;
        roll(notation: string): Promise<Die[]>;
        getRollResults?(): RollGroup[];
        clear?(): void;
    }
}
