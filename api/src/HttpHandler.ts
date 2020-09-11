import {LambdaHttpRequest, LambdaHttpResponse, UnifyreBackendProxyService} from "aws-lambda-helper";
import {LambdaHttpHandler} from "aws-lambda-helper/dist/HandlerFactory";
import {
    JsonRpcRequest,
    ValidationUtils
} from "ferrum-plumbing";
import { P2pSwap } from "./P2pSwapService";
import { Swap } from "./Types";

function handlePreflight(request: any) {
    if (request.method === 'OPTIONS' || request.httpMethod === 'OPTIONS') {
        return {
            body: '',
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': '*',
            },
            isBase64Encoded: false,
            statusCode: 200 as any,
        };
    }
}

export class HttpHandler implements LambdaHttpHandler {
    constructor(private uniBack: UnifyreBackendProxyService,
        private userSvc: P2pSwap,
        ) { }

    async handle(request: LambdaHttpRequest, context: any): Promise<LambdaHttpResponse> {
        let body: any = undefined;
        const preFlight = handlePreflight(request);
        if (preFlight) {
            return preFlight;
        }
        const req = JSON.parse(request.body) as JsonRpcRequest;
        const headers = request.headers as any;
        const jwtToken = (headers.authorization || headers.Authorization  || '').split(' ')[1];
        const userId = jwtToken ? (await this.uniBack.signInUsingToken(jwtToken)) : undefined;
        request.path = request.path || (request as any).url;
        try {
            switch (req.command) {
                case 'signInToServer':
                    const {token} = req.data;
                    const [userProfile, session] = await this.uniBack.signInToServer(token);
                    const currency = ((userProfile.accountGroups[0] || []).addresses[0] || {}).currency;
                    ValidationUtils.isTrue(!!currency, 'signed in user has no active wallet');
                    const activeSwaps = await this.userSvc.getActiveSwaps(userProfile.userId);
                    body = {userProfile, activeSwaps, session};
                    break;
                case 'createSwap':
                    ValidationUtils.isTrue(!!userId, 'Not signed in');
                    body = await this.createSwap(req);
                    break;
                case 'closeSwap':
                    ValidationUtils.isTrue(!!userId, 'Not signed in');
                    body = await this.closeSwap(userId!, req);
                    break;
                case 'getSwap':
                    ValidationUtils.isTrue(!!userId, 'Not signed in');
                    body = await this.getSwapByLinkId(req);
                    break;
                case 'submitSwap':
                    ValidationUtils.isTrue(!!userId, 'Not signed in');
                    body = await this.submitSwap(req);
                    break;
                case 'addApproveTransaction':
                    ValidationUtils.isTrue(!!userId, 'Not signed in');
                    body = await this.addApproveTransaction(userId!, req);
                    break;
                case 'addSubmitSwapTransactions':
                    ValidationUtils.isTrue(!!userId, 'Not signed in');
                    body = await this.addSubmitSwapTransactions(userId!, req);
                    break;
                case 'addSubmitCancelTransactions':
                    ValidationUtils.isTrue(!!userId, 'Not signed in');
                    body = await this.addSubmitCancelTransactions(userId!, req);
                    break;
                case 'addSubmitExecutionTransactions':
                    ValidationUtils.isTrue(!!userId, 'Not signed in');
                    body = await this.addSubmitExecutionTransactions(userId!, req);
                    break;
                case 'submitCancelSwap':
                    ValidationUtils.isTrue(!!userId, 'Not signed in');
                    body = await this.submitCancelSwap(userId!, req);
                    break;
                case 'lockSwap':
                    ValidationUtils.isTrue(!!userId, 'Not signed in');
                    body = await this.lockSwap(userId!, req);
                    break;
                case 'executeSwap':
                    ValidationUtils.isTrue(!!userId, 'Not signed in');
                    body = await this.executeSwap(req);
                    break;
                case 'approve':
                    ValidationUtils.isTrue(!!userId, 'Not signed in');
                    body = await this.approve(req);
                    break;
                default:
                    return {
                        body: JSON.stringify({error: 'bad request'}),
                        headers: {
                            'Access-Control-Allow-Origin': '*',
                            'Content-Type': 'application/json',
                        },
                        isBase64Encoded: false,
                        statusCode: 401 as any,
                    } as LambdaHttpResponse;
            }
            return {
                body: JSON.stringify(body),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST',
                    'Access-Control-Allow-Headers': '*',
                    'Content-Type': 'application/json',
                },
                isBase64Encoded: false,
                statusCode: 200,
            } as LambdaHttpResponse;
        } catch (e) {
            console.error('Error while calling API', req, e);
            return {
                body: JSON.stringify({error: e.toString()}),
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST',
                    'Access-Control-Allow-Headers': '*',
                    'Content-Type': 'application/json',
                },
                isBase64Encoded: false,
                statusCode: 501 as any,
            } as LambdaHttpResponse;
        }
    }

    async createSwap(req: JsonRpcRequest): Promise<Swap> {
        const {token, currency1, amount1, currency2, amount2} = req.data;
        validateFieldsRequired({token, currency1, amount1, currency2, amount2});
        return this.userSvc.createSwap(token, currency1, amount1, currency2, amount2);
    }

    async closeSwap(userId: string, req: JsonRpcRequest): Promise<Swap|undefined> {
        const {linkId} = req.data;
        validateFieldsRequired({linkId});
        return this.userSvc.closeSwap(userId, linkId);
    }

    async addApproveTransaction(userId: string, req: JsonRpcRequest): Promise<Swap|undefined> {
        const {linkId, approveTransactionId} = req.data;
        validateFieldsRequired({linkId, approveTransactionId});
        return this.userSvc.addApproveTransaction(userId, linkId, approveTransactionId);
    }

    async addSubmitSwapTransactions(userId: string, req: JsonRpcRequest): Promise<Swap|undefined> {
        const {linkId, submitTransactionId, approveTransactionId} = req.data;
        validateFieldsRequired({linkId, submitTransactionId});
        return this.userSvc.addSubmitSwapTransactions(userId, linkId, submitTransactionId, approveTransactionId);
    }

    async addSubmitCancelTransactions(userId: string, req: JsonRpcRequest): Promise<Swap|undefined> {
        const {linkId, cancelTransactionId, approveTransactionId} = req.data;
        validateFieldsRequired({linkId, cancelTransactionId, approveTransactionId});
        return this.userSvc.addSubmitCancelTransactions(userId, linkId, cancelTransactionId, approveTransactionId);
    }

    async addSubmitExecutionTransactions(userId: string, req: JsonRpcRequest): Promise<Swap|undefined> {
        const {linkId, executionTransactionId, approveTransactionId} = req.data;
        validateFieldsRequired({linkId, executionTransactionId});
        return this.userSvc.addSubmitExecuteTransactions(userId, linkId, executionTransactionId, approveTransactionId);
    }

    async submitSwap(req: JsonRpcRequest): Promise<{requestId: string}> {
        const {token, linkId} = req.data;
        validateFieldsRequired({token, linkId});
        const requestId = await this.userSvc.submitSwap(token, linkId);
        return {requestId};
    }

    async approve(req: JsonRpcRequest): Promise<{requestId: string}> {
        const {token, currency, value} = req.data;
        validateFieldsRequired({token, currency, value});
        const requestId = await this.userSvc.approve(token, currency, value);
        return {requestId};
    }

    async submitCancelSwap(userId: string, req: JsonRpcRequest): Promise<{requestId: string}> {
        const {token, linkId} = req.data;
        validateFieldsRequired({token, linkId});
        const requestId = await this.userSvc.submitCancelSwap(token, linkId);
        return {requestId};
    }

    async getSwapByLinkId(req: JsonRpcRequest): Promise<Swap|undefined> {
        const {linkId} = req.data;
        validateFieldsRequired({linkId});
        return this.userSvc.getSwapAndSync(linkId);
    }

    async lockSwap(userId: string, req: JsonRpcRequest): Promise<Swap> {
        const {linkId} = req.data;
        validateFieldsRequired({linkId});
        return this.userSvc.lockSwap(userId, linkId);
    }

    async executeSwap(req: JsonRpcRequest): Promise<{requestId: string}> {
        const {token, linkId} = req.data;
        validateFieldsRequired({token, linkId});
        const requestId = await this.userSvc.executeSwap(token, linkId);
        return {requestId};
    }
}

function validateFieldsRequired(obj: any) {
    for(const k in obj) {
        if (!obj[k]) {
            ValidationUtils.isTrue(false, `"${k}" must be provided`);
        }
    }
}