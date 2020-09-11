import { AppUserProfile } from "unifyre-extension-sdk/dist/client/model/AppUserProfile";
import { Swap } from "./Types";

export interface UserPreference {
    lastRedirectLink?: string;
    lastSuccessMessage?: string;
}

export const defaultUserPreference = {
} as UserPreference;

export interface DashboardProps {
    initialized: boolean;
    fatalError?: string;
    activeSwap?: string;
}

export interface SwapCreateState {
    currency1: string;
    amount1: string;
    currency2: string;
    amount2: string;
    error?: string;
}

export interface ExecuteState {
    error?: string;
    linkNotFound: boolean;
}

export interface ManageState extends ExecuteState {
}

export interface ApproveState extends ExecuteState {
    currency: string;
    amount: string;
    transactionSubmitted: boolean;
}

export interface RootState {
    data: {
        userData: { profile: AppUserProfile },
        userPreference: UserPreference,
        currentSwap: Swap,
        activeSwaps: string[],
    },
    ui: {
        flags: {
            waiting: boolean,
            waitingMsg: string;
        },
        dashboard: DashboardProps,
        create: SwapCreateState,
        execute: ExecuteState,
        manage: ManageState,
        approve: ApproveState,
    }
}