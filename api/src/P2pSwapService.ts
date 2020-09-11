import { MongooseConnection } from "aws-lambda-helper";
import { Injectable, ValidationUtils, ValidationError, Network } from "ferrum-plumbing";
import { Connection, Model, Document } from "mongoose";
import { Swap, SwapContractType } from "./Types";
import { UnifyreExtensionKitClient } from "unifyre-extension-sdk";
import { AppLinkRequest } from "unifyre-extension-sdk/dist/client/model/AppLink";
import { randomBytes } from "crypto";
import { SmartContratClient } from "./SmartContractClient";
import { SwapModel } from "./MongoTypes";

const SWAP_LOCK_TIMEOUT = 30 * 1000;

export class P2pSwap extends MongooseConnection implements Injectable {
    private model: Model<Swap & Document, {}> | undefined;
    constructor(
        private clientFac: () => UnifyreExtensionKitClient,
        private contractClient: SmartContratClient,
    ) {
        super();
    }

    /**
     * First, registers a link, then creates a swap.
     * At this point swap is not on chain
     */
    async createSwap(
        token: string,
        currency1: string,
        amount1: string,
        currency2: string,
        amount2: string,
        ): Promise<Swap> {
        ValidationUtils.isTrue(!!currency1, '"currency1" is required');
        ValidationUtils.isTrue(!!amount1, '"amount1" is required');
        ValidationUtils.isTrue(!!currency2, '"currency2" is required');
        ValidationUtils.isTrue(!!amount2, '"amount2" is required');
        const client = await this.uniClient(token);
        const id = '0x' + randomBytes(24).toString('hex');
        const address1Item = (client.getUserProfile().accountGroups[0] || []).addresses
            .find(ag => ag.currency === currency1);
        const address2Item = (client.getUserProfile().accountGroups[0] || []).addresses
            .find(ag => ag.currency === currency2);
        ValidationUtils.isTrue(!!address1Item, 'No address for currency ' + currency1);
        ValidationUtils.isTrue(!!address2Item, 'No address for currency ' + currency2);
        const linkId = await client.createLinkObject({
            data: {},
            imageMainLine: `${amount1}`,
            imageSecondLine: `${address1Item!.symbol}⇆${address2Item!.symbol}`,
            message: `${client.getUserProfile().displayName} wants to swap ${amount1} ${address1Item!.symbol} with ${amount2} ${address2Item!.symbol}`,
            imageTopTile: 'SWAP REQUEST',
        } as AppLinkRequest<any>);
        ValidationUtils.isTrue(!!linkId, 'Error creating link! Try again');
        const network = currency1.split(':')[0];
        const swap = {
            creationTime: Date.now(),
            id,
            address1: address1Item?.address,
            currency1: address1Item?.currency,
            symbol1: address1Item?.symbol,
            currency2,
            symbol2: address2Item?.symbol,
            linkId,
            network,
            token1: currency1.split(':')[1],
            token2: currency2.split(':')[1],
            value1: amount1,
            value2: amount2,
            version: 0,
            userId1: client.getUserProfile().userId,
            submitted: false,
            submittionTime: 0,
            executionTime: 0,
            executed: false,
            canceling: false,
            canceled: false,
            lockTime: 0,
        } as Swap;
        return await this.saveNew(swap);
    }

    /**
     * Closes a swap that is not on-chain. Just sets it as canceled on database, but first
     * ensures that it is not on chain and has no pending transaction.
     */
    async closeSwap(userId: string, linkId: string): Promise<Swap|undefined> {
        const swap = await this.getSwapByLinkId(linkId);
        ValidationUtils.isTrue(!!swap, 'Swap with the given link ID not found');
        ValidationUtils.isTrue(swap!.userId1 === userId, 'Not your swap');
        await this.ensureSwapIsNotSubmitted(swap!);
        const swapFromChain = await this.getSwapFromChain(swap!.network, swap!.id);
        ValidationUtils.isTrue(!swapFromChain, 'Swap is already on chain');
        const swapAgain = await this.getSwapByLinkId(swap!.linkId);
        swapAgain!.canceled = true;
        swapAgain!.cancelTime = Date.now();
        return await this.update(swapAgain!);
    }

    /**
     * Sends the swap for signature. Returns a request ID
     */
    async submitSwap(
        token: string,
        linkId: string,): Promise<string> {
        ValidationUtils.isTrue(!!token, '"token" must be provided');
        const client = await this.uniClient(token);
        const swap = await this.getSwapByLinkId(linkId);
        ValidationUtils.isTrue(!!swap, 'Swap with the given link ID not found');
        ValidationUtils.isTrue(swap!.userId1 === client.getUserProfile().userId, 'Not your swap');
        const chainSwap = await this.getSwapFromChain(swap!.network, swap!.id);
        ValidationUtils.isTrue(!chainSwap, 'Swap is already on chain');
        await this.ensureSwapIsNotSubmitted(swap!);
        const txs = await this.contractClient.registerSwap(swap!.network, swap!.id, swap!.address1,
            swap!.currency1, swap!.value1, swap!.currency2, swap!.value2);
        console.log('About  to submit transactions ', txs);
        return client.sendTransactionAsync(swap!.network, txs);
    }

    async approve(
        token: string,
        currency: string, value: string): Promise<string> {
        ValidationUtils.isTrue(!!token, '"token" must be provided');
        ValidationUtils.isTrue(!!currency, '"currency" must be provided');
        ValidationUtils.isTrue(!!value, '"value" must be provided');
        const client = await this.uniClient(token);
        const address = (client.getUserProfile().accountGroups[0] || []).addresses
            .find(ad => ad.currency === currency);
        ValidationUtils.isTrue(!!address, 'No address found for currency ' + currency);
        const txs = await this.contractClient.approveRequests(currency, address!.address, value);
        console.log('About  to submit transactions for approve only', txs);
        ValidationUtils.isTrue(!!txs.length, 'You have already set a higher approval.');
        return client.sendTransactionAsync(address!.network, txs);
    }

    async addApproveTransaction(userId: string,
        linkId: string, approveTransactionId: string): Promise<Swap> {
        ValidationUtils.isTrue(!!userId, '"userId" must be provided');
        ValidationUtils.isTrue(!!userId, '"approveTransactionId" must be provided');
        const swap = await this.getSwapByLinkId(linkId);
        ValidationUtils.isTrue(!!swap, 'Swap not found');
        let txs = swap!.allTransactions || [];
        if (txs.indexOf(approveTransactionId) < 0) {
            txs = txs.concat([approveTransactionId]);
        }
        swap!.allTransactions = txs;
        return this.update(swap!);
    }

    async addSubmitSwapTransactions(userId: string,
        linkId: string, submitTransactionId: string, approveTransactionId: string): Promise<Swap> {
        ValidationUtils.isTrue(!!userId, '"userId" must be provided');
        ValidationUtils.isTrue(!!submitTransactionId, '"submitTransactionId" must be provided');
        const swap = await this.getSwapByLinkId(linkId);
        ValidationUtils.isTrue(!!swap, 'Swap not found');
        swap!.submitTransactionId = submitTransactionId;
        swap!.submittionTime = Date.now();
        let txs = swap!.allTransactions || [];
        if (txs.indexOf(submitTransactionId) < 0) {
            txs = txs.concat([submitTransactionId]);
        }
        if (approveTransactionId && txs.indexOf(approveTransactionId) < 0) {
            txs = txs.concat([approveTransactionId]);
        }
        swap!.allTransactions = txs;
        return this.update(swap!);
    }

    async addSubmitCancelTransactions(userId: string,
        linkId: string, cancelTransactionId: string, approveTransactionId: string): Promise<Swap> {
        ValidationUtils.isTrue(!!userId, '"userId" must be provided');
        ValidationUtils.isTrue(!!userId, '"cancelTransactionId" must be provided');
        ValidationUtils.isTrue(!!userId, '"approveTransactionId" must be provided');
        const swap = await this.getSwapByLinkId(linkId);
        ValidationUtils.isTrue(!!swap, 'Swap not found');
        swap!.cancelTransactionId = cancelTransactionId;
        swap!.cancelTime = Date.now();
        let txs = swap!.allTransactions || [];
        if (txs.indexOf(approveTransactionId) < 0) {
            txs = txs.concat([approveTransactionId, cancelTransactionId]);
        }
        swap!.allTransactions = txs;
        return this.update(swap!);
    }

    async addSubmitExecuteTransactions(userId: string,
        linkId: string, executionTransactionId: string, approveTransactionId: string): Promise<Swap> {
        ValidationUtils.isTrue(!!userId, '"userId" must be provided');
        ValidationUtils.isTrue(!!executionTransactionId, '"executionTransactionId" must be provided');
        const swap = await this.getSwapByLinkId(linkId);
        ValidationUtils.isTrue(!!swap, 'Swap not found');
        swap!.executionTransactionId = executionTransactionId;
        swap!.executionTime = Date.now();
        let txs = swap!.allTransactions || [];
        if (txs.indexOf(executionTransactionId) < 0) {
            txs = txs.concat([executionTransactionId]);
        }
        if (approveTransactionId && txs.indexOf(approveTransactionId) < 0) {
            txs = txs.concat([approveTransactionId]);
        }
        swap!.allTransactions = txs;
        return this.update(swap!);
    }

    /**
     * Remove allocation and cancel on the contract
     */
    async submitCancelSwap(
        token: string,
        linkId: string): Promise<string> {
        const client = await this.uniClient(token);
        const swap = await this.getSwapByLinkId(linkId);
        ValidationUtils.isTrue(!!swap, 'Swap with the given link ID not found');
        ValidationUtils.isTrue(swap!.userId1 === client.getUserProfile().userId, 'Not your swap');
        const chainSwap = await this.getSwapFromChain(swap!.network, swap!.id);
        ValidationUtils.isTrue(!!chainSwap, 'Swap is not on chain');
        await this.ensureSwapIsNotCancelled(swap!);
        const txs = await this.contractClient.cancelSwap(swap!.network, swap!.id);
        console.log('About  to submit transactions ', txs);
        return client.sendTransactionAsync(swap!.network, txs);
    }

    /**
     * Temporarily locks swap to a user. Only for public swaps.
     */
    async lockSwap(userId: string, linkId: string): Promise<Swap> {
        const swap = await this.getSwapByLinkId(linkId);
        const now = Date.now();
        if (!swap!.lockedByUserId || swap!.lockTime + SWAP_LOCK_TIMEOUT > now) {
            swap!.lockedByUserId = userId;
            swap!.lockTime = now;
            await this.update(swap!);
        }
        throw new ValidationError('Swap is already locked ');
    }

    /**
     * Sends the execute for signature. Gets the appropriate address for the user from server.
     */
    async executeSwap(token: string, linkId: string): Promise<string> {
        const client = await this.uniClient(token);
        const swap = await this.getSwapByLinkId(linkId);
        ValidationUtils.isTrue(!!swap, 'Swap with the given link ID not found');
        const chainSwap = await this.getSwapFromChain(swap!.network, swap!.id);
        ValidationUtils.isTrue(!chainSwap!.address2, 'Swap has an executor address attached. Already executed.');
        const currency2 = `${swap!.network}:${chainSwap!.token2}`;
        const address2 = (client.getUserProfile().accountGroups[0] || []).addresses
            .find(ad => ad.currency === currency2);
        ValidationUtils.isTrue(!!address2, 'No address found for currency ' + currency2);
        await this.ensureSwapIsNotCancelled(swap!);
        const txs = await this.contractClient.executeswap(swap!.network, swap!.id, address2!.address);
        console.log('About  to submit transactions ', txs);
        return client.sendTransactionAsync(swap!.network, txs);
    }

    /**
     * Gets the swap but not so quickly:
     * 1. First get it from database.
     * 2. In parallel, get it from chain.
     * 3. Update db data with chain data (if there is a difference) and save it back to DB.
     * 4. Return the newly merged data.
     */
    async getSwapAndSync(linkId: string): Promise<Swap|undefined> {
        ValidationUtils.isTrue(!!linkId, '"linkId" is requried');
        const swap = await this.getSwapByLinkId(linkId);
        if (!swap) return;
        const chainSwap = await this.getSwapFromChain(swap.network, swap.id);
        const synced = await this.syncSwap(swap, chainSwap);
        if (
            swap.canceled !== synced.canceled ||
            swap.executed !== synced.executed ||
            swap.submitted !== synced.submitted
            ) {
            // Update the sync back
            await this.update(synced);
        }
        return synced;
    }

    async getSwapByLinkId(linkId: string): Promise<Swap|undefined> {
        ValidationUtils.isTrue(!!linkId, '"linkId" is requried');
        const link = await this.model?.findOne({linkId}).exec();
        if (!link) return;
        return link.toJSON();
    }

    async getActiveSwaps(userId: string): Promise<string[]> {
        ValidationUtils.isTrue(!!userId, '"userId" is requried');
        const links = await this.model!
            .find({"$and": [{userId1: userId}, {canceled: false}, {executed: false}]})
            .select({linkId: 1})
            .exec();
        if (!links) return [];
        return links.map(l => l.toJSON()).map(j => j.linkId);
    }

    /**
     * Get swap from DB and sync.
     */
    private async getSwapFromChain(network: Network, swapId: string): Promise<SwapContractType|undefined> {
        return this.contractClient.getSwap(network, swapId);
    }

    /**
     * Merges the DB and chain swap.
     */
    private async syncSwap(swap: Swap, chainSwap?: SwapContractType): Promise<Swap> {
        const s = {...swap};
        if (!chainSwap) {
            s.submitted = false;
            // Check for submitting
            if (!!s.submitTransactionId) {
                const submitting = await this.contractClient.helper.getTransactionStatus(
                    s.network, s.submitTransactionId!, s.submittionTime);
                s.submitting = (submitting === 'pending');
            }
        } else {
            ValidationUtils.isTrue(swap.id === chainSwap!.id, 'Trying to merge different swaps!');
            s.submitted = true;
            s.submitting = false;
            s.executed = chainSwap!.executed;
            s.executing = false;
            s.canceled = chainSwap!.canceled;
            s.canceling = false;
            s.token1 = chainSwap!.token1;
            s.token2 = chainSwap!.token2;
            s.value1 = chainSwap!.value1;
            s.value2 = chainSwap!.value2;

            if (!s.executed && !s.canceled && s.executionTransactionId) {
                const executing = await this.contractClient.helper.getTransactionStatus(
                    s.network, s.executionTransactionId!, s.executionTime);
                s.executing = (executing === 'pending');
            }
            if (!s.executed && !s.canceled && s.cancelTransactionId) {
                const canceling = await this.contractClient.helper.getTransactionStatus(
                    s.network, s.cancelTransactionId!, s.cancelTime);
                s.canceling = (canceling === 'pending');

            }
        }
        return s;
    }

    private async ensureSwapIsNotSubmitted(swap: Swap) {
        if (swap.submitTransactionId) {
            // Make sure transaction is not confirmed
            const status = await this.contractClient.helper.getTransactionStatus(swap!.network,
                swap!.submitTransactionId, swap!.submittionTime);
            ValidationUtils.isTrue(status !== 'pending',
                'There is already a pending transaction associated to this swap. ' +
                'Please wait for this transaction to complete: transaction ID: ' + swap!.submitTransactionId);
            ValidationUtils.isTrue(status !== 'successful', 
                'There is already a successful transaction associated to this swap. transaction ID: ' + swap!.submitTransactionId);
        }
    }

    private async ensureSwapIsNotCancelled(swap: Swap) {
        ValidationUtils.isTrue(!swap.canceled, "Swap is already canceled");
        if (swap.cancelTransactionId) {
            // Make sure transaction is not confirmed
            const status = await this.contractClient.helper.getTransactionStatus(swap!.network,
                swap!.cancelTransactionId, swap!.cancelTime);
            ValidationUtils.isTrue(status !== 'pending',
                'There is already a pending transaction to cancel this swap. ' +
                'Please wait for this transaction to complete: transaction ID: ' + swap!.submitTransactionId);
            ValidationUtils.isTrue(status !== 'successful', 
                'There is already a successful transaction to cancel this swap. transaction ID: ' + swap!.submitTransactionId);
        }
    }

    private async update(link: Swap) {
        const newPd = {...link};
        const version = link.version;
        newPd.version = version + 1;
        const id = link.id;
        const updated = await this.model!.findOneAndUpdate({ "$and": [{ id }, { version }] },
            { '$set': { ...newPd } }).exec();
        ValidationUtils.isTrue(!!updated, 'Error updating PoolDrop. Update returned empty. Retry');
        return updated?.toJSON();
    }

    private async saveNew(link: Swap) {
        const newSw = {...link};
        const saved = await new this.model!(newSw).save();
        ValidationUtils.isTrue(!!saved, 'Error saving PoolDrop. Update returned empty. Retry');
        return saved?.toJSON();
    }

    private async uniClient(token: string) {
        const client = this.clientFac();
        await client.signInWithToken(token);
        return client;
    }

    initModels(con: Connection): void {
        this.model = SwapModel(con);
    }
}