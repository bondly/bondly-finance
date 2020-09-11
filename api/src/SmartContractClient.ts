import { Injectable, LocalCache, ValidationUtils, Network } from "ferrum-plumbing";
// @ts-ignore
import * as p2pSwapAbi from './resources/P2pSwap.json';
import Big from 'big.js';
import { CustomTransactionCallRequest } from "unifyre-extension-sdk";
import { SwapContractType } from "./Types";
import { EthereumSmartContractHelper, Web3Utils } from 'aws-lambda-helper/dist/blockchain';

const Helper = EthereumSmartContractHelper;

export class SmartContratClient implements Injectable {
    cache: LocalCache;
    constructor(
        public helper: EthereumSmartContractHelper,
        private swapContract: { [network: string]: string},
    ) {
        this.cache = new LocalCache();
    }

    __name__() { return 'SmartContratClient'; }

    async getSwap(network: Network, swapId: string): Promise<SwapContractType|undefined> {
        ValidationUtils.isTrue(!!swapId, '"swapId" must be provided');
        ValidationUtils.isTrue(!!network, '"network" must be provided');
        const res = await this.p2pSwap(network).methods.getSwap(Web3Utils.zX(swapId)).call();
        if (!res || Web3Utils.isZeroAddress(res[0])) {
            return;
        }

        return this.swapToObj(network, swapId, res);
    }

    async registerSwap(network: string,
        swapId: string,
        address1: string,
        currency1: string,
        value1: string,
        currency2: string,
        value2: string,
        ): Promise<CustomTransactionCallRequest[]> {
        ValidationUtils.isTrue(!!address1, "'address1' must be provided");
        ValidationUtils.isTrue(!!currency1, "'currency1' must be provided");
        ValidationUtils.isTrue(!!value1, "'value1' must be provided");
        ValidationUtils.isTrue(!!currency2, "'currency2' must be provided");
        ValidationUtils.isTrue(!!value2, "'value2' must be provided");
        const cur1Network = currency1.split(':')[0];
        const token1 = currency1.split(':')[1];
        const cur2Network = currency2.split(':')[0];
        const token2 = currency2.split(':')[1];
        ValidationUtils.isTrue(cur1Network === cur2Network && cur2Network === network, 'Inconsistent network between currencies');
        const contract = this.swapContract[network];
        ValidationUtils.isTrue(!!contract, 'No contract address is configured for this network');
        const tok1DecimalFactor = 10 ** await this.helper.decimals(network, token1);
        const tok2DecimalFactor = 10 ** await this.helper.decimals(network, token2);
        const amount1 = new Big(value1).times(new Big(tok1DecimalFactor));
        const amount2 = new Big(value2).times(new Big(tok2DecimalFactor));
        const amount1Human = amount1.div(tok1DecimalFactor).toString();
        const amount2Human = amount2.div(tok2DecimalFactor).toString();
        const symbol1 = await this.helper.symbol(network, token1);
        const symbol2 = await this.helper.symbol(network, token2);
        const [nonce, requests] = await this.helper.approveRequests(currency1, address1, amount1.toFixed(),
            this.swapContract[network], 'SwapDrop contract');
        const [swap, swapGas] = await this._registerSwap(network,
            Web3Utils.zX(swapId),
            address1,
            token1,
            amount1.toFixed(),
            token2,
            amount2.toFixed(),);
        requests.push(
            Helper.callRequest(contract, currency1, address1, swap, swapGas.toString(), nonce,
                `Swap ${amount1Human} ${symbol1} with ${amount2Human} ${symbol2}`,)
        );
        return requests;
    }

    async executeswap(network: Network, swapId: string, address2: string): Promise<CustomTransactionCallRequest[]> {
        ValidationUtils.isTrue(!!network, '"network" must be provided');
        ValidationUtils.isTrue(!!swapId, '"swapId" must be provided');
        ValidationUtils.isTrue(!!address2, '"address2" must be provided');
        const contract = this.swapContract[network];
        ValidationUtils.isTrue(!!contract, 'No contract address is configured for this network');
        const swap = await this.getSwap(network, swapId);
        ValidationUtils.isTrue(!!swap, '"swap" with provided id not found');
        const symbol1 = await this.helper.symbol(network, swap!.token1);
        const symbol2 = await this.helper.symbol(network, swap!.token2);
        const currency2 = `${network}:${swap?.token2}`;

        const amount1Human = swap!.value1;
        const amount2Human = swap!.value2;
        const [nonce, requests] = await this.helper.approveRequests(currency2, address2,
            new Big(swap!.value2Raw).toFixed(), contract, 'SwapDrop contract');
        const [exec, execGas] = await this._executeSwap(network, swapId, address2);
        requests.push(
            Helper.callRequest(contract, currency2, address2, exec, execGas.toString(), nonce,
                `Swap ${amount2Human} ${symbol2} with ${amount1Human} ${symbol1}`,),
        );
        return requests;
    }

    async cancelSwap(network: Network, swapId: string): Promise<CustomTransactionCallRequest[]> {
        ValidationUtils.isTrue(!!network, '"network" must be provided');
        ValidationUtils.isTrue(!!swapId, '"swapId" must be provided');
        const swap = await this.getSwap(network, swapId);
        ValidationUtils.isTrue(!!swap, '"swap" with provided id not found');
        const contract = this.swapContract[network];
        const currentApproval = await this.helper.currentAllowance(network, swap!.token1, swap!.address1, contract);
        const [approve, approveGas] = currentApproval.eq(new Big(0)) ? [undefined, 0] : await this.helper.approveToZero(
            network, swap!.token1, swap!.address1, contract);
        const [cancel, cancelGas] = await this._cancelSwap(network, swap!.address1, swapId);
        let nonce = await this.helper.web3(network).getTransactionCount(swap!.address1, 'pending');
        const symbol1 = await this.helper.symbol(network, swap!.token1);
        const currency1 = `${network}:${swap!.token1}`;
        ValidationUtils.isTrue(!!contract, 'No contract address is configured for this network');
        const requests: CustomTransactionCallRequest[] = [];
        if (approve) {
            requests.push(
                Helper.callRequest(swap!.token1, currency1, swap!.address1, approve, approveGas.toString(), nonce,
                    `Remove all approvals of ${symbol1} from SwapDrop contract`,),
            );
            nonce ++;
        }
        requests.push(
            Helper.callRequest(contract, currency1, swap!.address1, cancel, cancelGas.toString(), nonce,
                `Cancel swap request with ID ${swapId}`,),
        );
        return requests;
    }

    async approveRequests(currency: string, approver: string, value: string) {
        const network = currency.split(':')[0];
        const contract = this.swapContract[network];
        const [_, requests] = await this.helper.approveRequests(currency, approver, value, contract, 'P2pSwap contract');
        return requests;
    }

    private async _registerSwap(network: string, 
        swapId: string,
        address1: string,
        token1: string,
        value1: string,
        token2: string,
        value2: string,
        ) {
        console.log('about to register swap: ', { swapId, address1, token1, value1, token2, value2 });
        const m = this.p2pSwap(network).methods.registerSwap(
            Web3Utils.zX(swapId),
            token1,
            value1,
            token2,
            value2,);
        const gas = await m.estimateGas({from: address1});
        return [m.encodeABI(), gas];
    }

    private async _cancelSwap(network: string, from: string, swapId: string) {
        console.log('about to cancel swap: ', network, swapId);
        const m = this.p2pSwap(network).methods.cancelSwap(
            Web3Utils.zX(swapId));
        const gas = await m.estimateGas({from});
        return [m.encodeABI(), gas];
    }

    private async _executeSwap(network: string, swapId: string, address2: string) {
        console.log('about to excute swap: ', {swapId, address2});
        const m = this.p2pSwap(network).methods.executeSwap(
            Web3Utils.zX(swapId));
        // const gas = await m.estimateGas({from: address2});
        return [m.encodeABI(), 80000 * 2];
    }

    private async swapToObj(network: Network, id: string, result: any): Promise<SwapContractType> {
        const executed = Number(result[5].toString() || '0'); 
        const token1 = result[1].toString().toLowerCase();
        const tok1DecimalFactor = 10 ** await this.helper.decimals(network, token1);
        const value1 = new Big(result[2].toString()).div(tok1DecimalFactor).toFixed();
        const token2 = result[3].toString().toLowerCase();
        const tok2DecimalFactor = 10 ** await this.helper.decimals(network, token2);
        const value2 = new Big(result[4].toString()).div(tok2DecimalFactor).toFixed();
        return {
            id,
            address1: result[0].toString().toLowerCase(),
            token1,
            value1,
            value1Raw: result[2].toString(),
            token2,
            value2,
            value2Raw: result[4].toString(),
            executed: executed === 1,
            canceled: executed === 2,
        };
    }

    private p2pSwap(network: string) {
        const web3 = this.helper.web3(network);
        return new web3.Contract(p2pSwapAbi.abi as any, this.swapContract[network]);
    }
}
