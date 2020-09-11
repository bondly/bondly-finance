import { Network } from "ferrum-plumbing";

export interface SwapContractType {
    id: string;
    address1: string;
    token1: string;
    value1: string;
    address2?: string;
    token2: string;
    value2: string;
    executed: boolean;
    canceled: boolean;
}

export interface Swap extends SwapContractType  {
    creationTime: number;
    version: number;
    linkId: string;
    network: Network;
    userId1: string;
    currency1: string;
    symbol1: string;
    userId2?: string;
    currency2: string;
    symbol2: string;
    submitted: boolean;
    submitting: boolean;
    submittionTime: number;
    submitTransactionId?: string;
    executing: boolean;
    executionTime: number;
    executionTransactionId?: string;
    canceling: boolean;
    cancelTime: number;
    cancelTransactionId?: string;
    lockedByUserId?: string;
    lockTime: number;
    allTransactions: string;
}
