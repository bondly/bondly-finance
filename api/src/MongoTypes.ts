import {ValidationUtils} from "ferrum-plumbing";
import { Schema, Connection, Document } from "mongoose";
import { Swap } from "./Types";

const swapSchema: Schema = new Schema<Swap>({
    creationTime: Number,
    version: Number,
    id: String,
    linkId: String,
    network: String,
    userId1: String,
    address1: String,
    currency1: String,
    token1: String,
    symbol1: String,
    value1: String,
    userId2: String,
    address2: String,
    currency2: String,
    token2: String,
    symbol2: String,
    value2: String,
    submitted: Boolean,
    submittionTime: Number,
    submitTransactionId: String,
    executed: Boolean,
    executionTime: Number,
    executionTransactionId: String,
    canceling: Boolean,
    canceled: Boolean,
    cancelTime: Number,
    cancelTransactionId: String,
    lockedByUserId: String,
    lockTime: Number,
    allTransactions: [String],
});

export const SwapModel = (c: Connection) => c.model<Swap&Document>('swaps', swapSchema);

export function getEnv(env: string) {
    const res = process.env[env];
    ValidationUtils.isTrue(!!res, `Make sure to set environment variable '${env}'`);
    return res!;
}