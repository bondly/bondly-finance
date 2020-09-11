import { Injectable, JsonRpcRequest, ValidationUtils } from "ferrum-plumbing";
import { AnyAction, Dispatch } from "redux";
import { SendMoneyResponse, UnifyreExtensionKitClient } from "unifyre-extension-sdk";
import { AppUserProfile } from "unifyre-extension-sdk/dist/client/model/AppUserProfile";
import { addAction, CommonActions } from "../common/Actions";
import { CONFIG } from "../common/IocModule";
import { Swap } from "../common/Types";
import { Utils } from "../common/Utils";
import Big from 'big.js';
import { intl } from "unifyre-react-helper";

export const P2pSwapServiceActions = {
    TOKEN_NOT_FOUND_ERROR: 'TOKEN_NOT_FOUND_ERROR',
    API_ERROR: 'API_ERROR',
    AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
    AUTHENTICATION_COMPLETED: 'AUTHENTICATION_COMPLETED',
    USER_DATA_RECEIVED: 'USER_DATA_RECEIVED',
    ACTIVE_SWAPS_RECEIVED: 'ACTIVE_SWAPS_RECEIVED',
    GET_SWAP_FAILED: 'GET_SWAP_FAILED',
    SWAP_NOT_FOUND: 'SWAP_NOT_FOUND',

    SWAP_RECEIVED: 'SWAP_RECEIVED',
    SWAP_RECEIVE_FAILED: 'SWAP_RECEIVE_FAILED',
    CREATE_SWAP_FAILED: 'CREATE_SWAP_FAILED',
    CLOSE_SWAP_FAILED: 'CLOSE_SWAP_FAILED',
    LOCK_SWAP_FAILED: 'LOCK_SWAP_FAILED',
    SUBMIT_SWAP_FAILED: 'SUBMIT_SWAP_FAILED',
    APPROVE_FAILED: 'APPROVE_FAILED',

    SELECT_APPROVE_CURRENCY: 'SELECT_APPROVE_CURRENCY',
};

const Actions = P2pSwapServiceActions;

function openUnifyre() {
    const w = window.open('https://app.unifyre.io', '_blank');
    setTimeout(() => { if (w) { w.close(); } }, 4000);
}

export class P2pSwapClient implements Injectable {
    private jwtToken: string = '';
    constructor(
        private client: UnifyreExtensionKitClient,
    ) {
    }

    __name__() { return 'P2pSwapClient'; }

    async signInToServer(dispatch: Dispatch<AnyAction>): Promise<AppUserProfile | undefined> {
        const token = this.getToken(dispatch);
        if (!token) { return; }
        try {
            dispatch(addAction(CommonActions.WAITING, { source: 'signInToServer' }));
            const res = await this.api({
                command: 'signInToServer', data: {token}, params: [] } as JsonRpcRequest);
            const {userProfile, activeSwaps, session} = res;
            if (!session) {
                dispatch(addAction(Actions.AUTHENTICATION_FAILED, { message: 'Could not connect to Unifyre' }));
                return;
            }
            this.jwtToken = session;
            dispatch(addAction(Actions.AUTHENTICATION_COMPLETED, { }));
            dispatch(addAction(Actions.ACTIVE_SWAPS_RECEIVED, { activeSwaps }));
            dispatch(addAction(Actions.USER_DATA_RECEIVED, { userProfile }));
            return userProfile;
        } catch (e) {
            console.error('Error sigining in', e);
            dispatch(addAction(Actions.AUTHENTICATION_FAILED, { message: 'Could not connect to Unifyre' }));
        } finally {
            dispatch(addAction(CommonActions.WAITING_DONE, { source: 'signInToServer' }));
        }
    }

    async createSwap(dispatch: Dispatch<AnyAction>,
        currency1: string,
        amount1: string,
        currency2: string,
        amount2: string,
        balance: string,
        ): Promise<Swap|undefined> {
        const token = this.getToken(dispatch);
        ValidationUtils.isTrue(!!token, 'Sign in token not found');
        try {
            ValidationUtils.isTrue(new Big(balance).gte(new Big(amount1)), 'Not enough balance to create this swap');
            dispatch(addAction(CommonActions.WAITING, { source: 'createSwap' }));
            const swap = await this.api({
                command: 'createSwap',
                data: { token, currency1, amount1, currency2, amount2 },
                params: [],
            } as JsonRpcRequest);
            if (!swap) {
                dispatch(addAction(Actions.CREATE_SWAP_FAILED, { message: 'Could not create the swap. A server error occured. Try again.' }));
            }
            return swap;
        } catch (e) {
            console.error('Error sigining in', e);
            dispatch(addAction(Actions.CREATE_SWAP_FAILED, { message: e.message || 'Could not create the swap' }));
        } finally {
            dispatch(addAction(CommonActions.WAITING_DONE, { source: 'createSwap' }));
        }
    }

    async getSwap(dispatch: Dispatch<AnyAction>, linkId: string): Promise<Swap|undefined> {
        try {
            dispatch(addAction(CommonActions.WAITING, { source: 'getSwap' }));
            const swap = await this.api({
                command: 'getSwap', data: {linkId}, params: [] } as JsonRpcRequest);
            if (!swap) {
                dispatch(addAction(Actions.SWAP_NOT_FOUND, { message: 'Link not found' }));
                return;
            }
            dispatch(addAction(Actions.SWAP_RECEIVED, { swap }));
            return swap;
        } catch (e) {
            console.error('Error get swap', e);
            dispatch(addAction(Actions.GET_SWAP_FAILED, { message: e.message }));
        } finally {
            dispatch(addAction(CommonActions.WAITING_DONE, { source: 'getSwap' }));
        }
    }

    async closeSwap(dispatch: Dispatch<AnyAction>,
        linkId: string,
        ): Promise<Swap|undefined> {
        try {
            dispatch(addAction(CommonActions.WAITING, { source: 'closeSwap' }));
            const swap = await this.api({
                command: 'closeSwap',
                data: { linkId },
                params: [],
            } as JsonRpcRequest);
            if (!swap) {
                dispatch(addAction(Actions.CLOSE_SWAP_FAILED, { message: 'Could not close the swap. A server error occured. Try again.' }));
            }
            return await this.getSwap(dispatch, linkId);
        } catch (e) {
            console.error('Error closing swap', e);
            dispatch(addAction(Actions.CLOSE_SWAP_FAILED, { message: e.message || 'Could not close the swap' }));
        } finally {
            dispatch(addAction(CommonActions.WAITING_DONE, { source: 'closeSwap' }));
        }
    }

    async lockSwap(dispatch: Dispatch<AnyAction>,
        linkId: string,
        ): Promise<Swap|undefined> {
        try {
            dispatch(addAction(CommonActions.WAITING, { source: 'lockSwap' }));
            const swap = await this.api({
                command: 'lockSwap',
                data: { linkId },
                params: [],
            } as JsonRpcRequest);
            if (!swap) {
                dispatch(addAction(Actions.LOCK_SWAP_FAILED, { message: 'Could not lock the swap. A server error occured. Try again.' }));
            }
            return swap;
        } catch (e) {
            console.error('Error locking swap', e);
            dispatch(addAction(Actions.LOCK_SWAP_FAILED, { message: e.message || 'Could not lock the swap' }));
        } finally {
            dispatch(addAction(CommonActions.WAITING_DONE, { source: 'lockSwap' }));
        }
    }

    async approve(dispatch: Dispatch<AnyAction>, linkId: string, currency: string, value: string) {
        try {
            dispatch(addAction(CommonActions.WAITING, { source: 'approve', message: intl('waiting-for-sign') }));
            const token = this.getToken(dispatch);
            if (!token) { return; }
            const {requestId} = await this.api({
                command: 'approve', data: {token, currency, value}, params: []
            } as JsonRpcRequest) as {requestId: string};
            if (!requestId) {
                dispatch(addAction(Actions.APPROVE_FAILED, { message: 'Could not submit an approve request.' }));
                return;
            }
            openUnifyre();
            this.client.setToken(token);
            // TODO: Fix the response format in client
            // {"serverError":null,"data":{"requestId":"659ff5c5-5e6a-407a-835d-d43e8b64aee2","appId":"POOL_DROP","response":[{"transactionId":"0x4d6b570dea6d5940e4dd8ea09f930622593ff19a8b733c0deda0927dd3d7929e"},{"transactionId":"0xab28e8cadb0cd73e8f8788a89065f62cae06f746da44ef6147b900341cca8514"}]}}
            const response = await this.client.getSendTransactionResponse(requestId) as any;
            if (response.rejected) {
                throw new Error(response.reason || 'Request was rejected');
            }
            const transactionIds = (response.response as SendMoneyResponse[]).map(r => r.transactionId);

            if (transactionIds && transactionIds.length) {
                const res = await this.api({
                    command: 'addApproveTransaction', data: {
                        approveTransactionId: transactionIds[0], linkId }, params: []
                } as JsonRpcRequest) as {requestId: string};
                ValidationUtils.isTrue(!!res, 'Error updating transaction IDs');
                return this.getSwap(dispatch, linkId);
            } else {
                dispatch(addAction(Actions.APPROVE_FAILED, { message:
                    'No transaction ID was received from unifyre.' +
                    ' Make sure to doube check your unifyre wallet and etherscan to ensure there was ' +
                    'no transaction submitted to chain before retrying. ' +
                    'Otherwise you may risk double paying a link drop' }));
            }
        } catch (e) {
            console.error('Error approve', e);
            dispatch(addAction(Actions.APPROVE_FAILED, { message: 'Could not submit an approve request.' + e.message || '' }));
        } finally {
            dispatch(addAction(CommonActions.WAITING_DONE, { source: 'approve' }));
        }
    }

    async submitSwap(dispatch: Dispatch<AnyAction>, linkId: string) {
        try {
            dispatch(addAction(CommonActions.WAITING, { source: 'submitSwap', message: intl('waiting-for-sign') }));
            const token = this.getToken(dispatch);
            if (!token) { return; }
            const {requestId} = await this.api({
                command: 'submitSwap', data: {linkId, token}, params: []
            } as JsonRpcRequest) as {requestId: string};
            if (!requestId) {
                dispatch(addAction(Actions.SUBMIT_SWAP_FAILED, { message: 'Could not submit a swap request.' }));
                return;
            }
            openUnifyre();
            this.client.setToken(token);
            // TODO: Fix the response format in client
            // {"serverError":null,"data":{"requestId":"659ff5c5-5e6a-407a-835d-d43e8b64aee2","appId":"POOL_DROP","response":[{"transactionId":"0x4d6b570dea6d5940e4dd8ea09f930622593ff19a8b733c0deda0927dd3d7929e"},{"transactionId":"0xab28e8cadb0cd73e8f8788a89065f62cae06f746da44ef6147b900341cca8514"}]}}
            const response = await this.client.getSendTransactionResponse(requestId) as any;
            if (response.rejected) {
                throw new Error(response.reason || 'Request was rejected');
            }
            const transactionIds = (response.response as SendMoneyResponse[]).map(r => r.transactionId);

            if (transactionIds && transactionIds.length) {
                const tLen = transactionIds.length;
                const res = await this.api({
                    command: 'addSubmitSwapTransactions', data: {
                        approveTransactionId: transactionIds[tLen - 2],
                        submitTransactionId: transactionIds[tLen - 1], linkId }, params: []
                } as JsonRpcRequest) as {requestId: string};
                ValidationUtils.isTrue(!!res, 'Error updating transaction IDs');
                return this.getSwap(dispatch, linkId);
            } else {
                dispatch(addAction(Actions.SUBMIT_SWAP_FAILED, { message:
                    'No transaction ID was received from unifyre.' +
                    ' Make sure to doube check your unifyre wallet and etherscan to ensure there was ' +
                    'no transaction submitted to chain before retrying. ' +
                    'Otherwise you may risk double paying a link drop' }));
            }
        } catch (e) {
            console.error('Error submitSwap', e);
            dispatch(addAction(Actions.SUBMIT_SWAP_FAILED, { message: 'Could not submit a swap request.' + e.message || '' }));
        } finally {
            dispatch(addAction(CommonActions.WAITING_DONE, { source: 'submitSwap' }));
        }
    }

    async executeSwap(dispatch: Dispatch<AnyAction>, linkId: string) {
        try {
            dispatch(addAction(CommonActions.WAITING, { source: 'executeSwap', message: intl('waiting-for-sign') }));
            const token = this.getToken(dispatch);
            if (!token) { return; }
            const {requestId} = await this.api({
                command: 'executeSwap', data: {linkId, token}, params: []
            } as JsonRpcRequest) as {requestId: string};
            if (!requestId) {
                dispatch(addAction(Actions.SUBMIT_SWAP_FAILED, { message: 'Could not submit an execute swap request.' }));
                return;
            }
            openUnifyre();
            this.client.setToken(token);
            // TODO: Fix the response format in client
            // {"serverError":null,"data":{"requestId":"659ff5c5-5e6a-407a-835d-d43e8b64aee2","appId":"POOL_DROP","response":[{"transactionId":"0x4d6b570dea6d5940e4dd8ea09f930622593ff19a8b733c0deda0927dd3d7929e"},{"transactionId":"0xab28e8cadb0cd73e8f8788a89065f62cae06f746da44ef6147b900341cca8514"}]}}
            const response = await this.client.getSendTransactionResponse(requestId) as any;
            if (response.rejected) {
                throw new Error(response.reason || 'Request was rejected');
            }
            const transactionIds = (response.response as SendMoneyResponse[]).map(r => r.transactionId);

            if (transactionIds && transactionIds.length) {
                const tLen = transactionIds.length;
                const res = await this.api({
                    command: 'addSubmitExecutionTransactions', data: {
                        approveTransactionId: transactionIds[tLen - 2],
                        executionTransactionId: transactionIds[tLen - 1], linkId }, params: []
                } as JsonRpcRequest) as {requestId: string};
                ValidationUtils.isTrue(!!res, 'Error updating transaction IDs');
                return this.getSwap(dispatch, linkId);
            } else {
                dispatch(addAction(Actions.SUBMIT_SWAP_FAILED, { message:
                    'No transaction ID was received from unifyre.' +
                    ' Make sure to doube check your unifyre wallet and etherscan to ensure there was ' +
                    'no transaction submitted to chain before retrying. ' +
                    'Otherwise you may risk double paying a link drop' }));
            }
        } catch (e) {
            console.error('Error submitSwap', e);
            dispatch(addAction(Actions.SUBMIT_SWAP_FAILED, { message: 'Could not submit an execute swap request.' + e.message || '' }));
        } finally {
            dispatch(addAction(CommonActions.WAITING_DONE, { source: 'executeSwap' }));
        }
    }

    async submitCancelSwap(dispatch: Dispatch<AnyAction>, linkId: string) {
        try {
            dispatch(addAction(CommonActions.WAITING, { source: 'submitCancelSwap', message: intl('waiting-for-sign') }));
            const token = this.getToken(dispatch);
            if (!token) { return; }
            const {requestId} = await this.api({
                command: 'submitCancelSwap', data: {linkId, token}, params: []
            } as JsonRpcRequest) as {requestId: string};
            if (!requestId) {
                dispatch(addAction(Actions.SUBMIT_SWAP_FAILED, { message: 'Could not submit a cancel swap request.' }));
            }
            this.client.setToken(token);
            // TODO: Fix the response format in client
            // {"serverError":null,"data":{"requestId":"659ff5c5-5e6a-407a-835d-d43e8b64aee2","appId":"POOL_DROP","response":[{"transactionId":"0x4d6b570dea6d5940e4dd8ea09f930622593ff19a8b733c0deda0927dd3d7929e"},{"transactionId":"0xab28e8cadb0cd73e8f8788a89065f62cae06f746da44ef6147b900341cca8514"}]}}
            const response = await this.client.getSendTransactionResponse(requestId) as any;
            if (response.rejected) {
                throw new Error(response.reason || 'Request was rejected');
            }
            const transactionIds = (response.response as SendMoneyResponse[]).map(r => r.transactionId);

            if (transactionIds && transactionIds.length) {
                const tLen = transactionIds.length;
                const res = await this.api({
                    command: 'addSubmitCancelTransactions', data: {
                        approveTransactionId: transactionIds[tLen - 2],
                        cancelTransactionId: transactionIds[tLen - 1], linkId }, params: []
                } as JsonRpcRequest) as {requestId: string};
                ValidationUtils.isTrue(!!res, 'Error updating transaction IDs');
                return this.getSwap(dispatch, linkId);
            } else {
                dispatch(addAction(Actions.SUBMIT_SWAP_FAILED, { message:
                    'No transaction ID was received from unifyre.' +
                    ' Make sure to doube check your unifyre wallet and etherscan to ensure there was ' +
                    'no transaction submitted to chain before retrying. ' +
                    'Otherwise you may risk double paying a link drop' }));
            }
        } catch (e) {
            console.error('Error submitSwap', e);
            dispatch(addAction(Actions.SUBMIT_SWAP_FAILED, { message: 'Could not submit a swap request.' + e.message || '' }));
        } finally {
            dispatch(addAction(CommonActions.WAITING_DONE, { source: 'submitSwap' }));
        }
    }

    private getToken(dispatch: Dispatch<AnyAction>) {
        const storedToken = localStorage.getItem('SIGNIN_TOKEN');
        const token = Utils.getQueryparam('token') || storedToken;
        if (!!token && token !== storedToken) {
            localStorage.setItem('SIGNIN_TOKEN', token!);
        }
        if (!token) {
            dispatch(addAction(Actions.TOKEN_NOT_FOUND_ERROR, {}));
            return;
        }
        return token;
    }

    private async api(req: JsonRpcRequest): Promise<any> {
        try {
            const res = await fetch(CONFIG.p2pSwapBackend, {
                method: 'POST',
                mode: 'cors',
                body: JSON.stringify(req),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.jwtToken}`
                },
            });
            const resText = await res.text();
            if (Math.round(res.status / 100) === 2) {
                return resText ? JSON.parse(resText) : undefined;
            }
            const error = resText;
            let jerror: any;
            try {
                jerror = JSON.parse(error);
            } catch (e) {}
            console.error('Server returned an error when calling ', req, {
                status: res.status, statusText: res.statusText, error});
            throw new Error(jerror?.error ? jerror.error : error);
        } catch (e) {
            console.error('Error calling api with ', req, e);
            throw e;
        }
    }
}

export function currentSwapReducer(state: Swap = {} as any, action: AnyAction) {
    switch (action.type) {
        case Actions.SWAP_RECEIVED:
            const {swap} = action.payload;
            return {...swap};
        default:
            return state;
    }
}

export function activeSwapReducer(state: string[] = [], action: AnyAction) {
    switch (action.type) {
        case Actions.ACTIVE_SWAPS_RECEIVED:
            const { activeSwaps } = action.payload;
            return [...activeSwaps];
        default:
            return state;
    }
}