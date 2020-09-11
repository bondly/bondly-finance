import { Network, EncryptedData } from "ferrum-plumbing";
import { MongooseConfig } from "aws-lambda-helper";

export interface SwapContractType {
    id: string;
    address1: string;
    token1: string;
    value1: string;
    value1Raw: string;
    address2?: string;
    token2: string;
    value2: string;
    value2Raw: string;
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
    submittionTime: number;
    submitTransactionId?: string;
    submitting: boolean;
    executionTime: number;
    executionTransactionId?: string;
    executing: boolean;
    cancelTime: number;
    cancelTransactionId?: string;
    canceling: boolean;
    lockedByUserId?: string;
    lockTime: number;
    allTransactions: string[];
}

export interface P2pSwapConfig {
    database: MongooseConfig;
    region: string;
    authRandomKey: string;
    signingKeyHex?: string;
    signingKey?: EncryptedData;
    web3ProviderRinkeby: string;
    web3ProviderEthereum: string;
    backend: string;
    cmkKeyArn: string;
}