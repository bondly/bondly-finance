import { Network } from "ferrum-plumbing";
import { AnyAction, Dispatch } from "redux";
import { inject } from "../../common/IocModule";
import { ExecuteState, RootState } from "../../common/RootState";
import { Utils } from "../../common/Utils";
import { P2pSwapClient, P2pSwapServiceActions } from "../../services/P2pSwapClient";
import { formatter } from "../../services/RatesService";
import { History } from 'history';
import { addAction } from "../../common/Actions";
import Big from 'big.js';

const Actions = P2pSwapServiceActions;

const defaultExecuteState = { linkNotFound: false };

export interface ExecuteProps {
    network: Network;
    userId: string;
    linkId: string;
    symbol1: string;
    amount1: string;
    symbol2: string;
    amount2: string;
    bothCurrenciesEnabled: boolean;
    balance: string;
    error?: string;
    submitted: boolean;
    submiting: boolean;
    executed: boolean;
    canceled: boolean;
    pendingCancellation: boolean;
    transactionIds: string[];
    pendingTransactionId?: string;
    linkNotFound: boolean;
    currency: string;
}

export interface ExecuteDispatch {
    onLoad: (history: History, userId: string, linkId: string) => void;
    onExecute: (props: ExecuteProps) => void;
    onOpenApprove: (history: History, currency: string) => void;
}

const mapStateToProps = (root: RootState) => {
    const state = root.ui.execute;
    const user = root.data.userData.profile;
    const swap = root.data.currentSwap;
    const addr1 = Utils.getUserAddresses(user, swap.currency1)! || {} as any;
    const addr2 = Utils.getUserAddresses(user, swap.currency2)! || {} as any;
    return {
        ...state,
        network: swap.network,
        balance: formatter.format(addr2.balance),
        bothCurrenciesEnabled: !!addr1.currency && !!addr2.currency,
        linkId: swap.linkId,
        userId: root.data.userData.profile.userId,
        amount1: formatter.format(swap.value1),
        amount2: formatter.format(swap.value2),
        currency: addr2!.currency,
        symbol1: swap.symbol1,
        symbol2: swap.symbol2,
        submitted: swap.submitted,
        submiting: swap.submitting,
        canceled: swap.canceled,
        executed: swap.executed,
        pendingCancellation: swap.canceling,
        pendingTransactionId: swap.submitting ? swap.submitTransactionId! :
            swap.canceling ? swap.cancelTransactionId! :
                swap.executing ? swap.executionTransactionId :
                    undefined,
        transactionIds: swap.allTransactions || [],
        error: state.error,
    } as ExecuteProps;
}

const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) => ({
    onLoad: async (history, userId, linkId) => {
        const client = inject<P2pSwapClient>(P2pSwapClient);
        const swap = await client.getSwap(dispatch, linkId);
        if (swap!.userId1 === userId) {
            history.replace(`/manage/${linkId}`);
        }
        return swap;
    },
    onExecute: async props => {
        const client = inject<P2pSwapClient>(P2pSwapClient);
        if (new Big(formatter.unFormat(props.balance) || '0').lt(new Big(formatter.unFormat(props.amount2) || '0'))) {
            dispatch(addAction(Actions.SUBMIT_SWAP_FAILED, {
                message: 'Not enough balance to execute this swap' }));
        } else {
            return client.executeSwap(dispatch, props.linkId);
        }
    },
    onOpenApprove: async (history, currency) => {
        dispatch(addAction(Actions.SELECT_APPROVE_CURRENCY, { value: currency }));
        history.push('/approve');
    },
} as ExecuteDispatch);

function reduce(state: ExecuteState = defaultExecuteState, action: AnyAction) {
    switch(action.type) {
        case Actions.SWAP_NOT_FOUND:
            return {...state, error: action.payload.message, linkNotFound: true};
        case Actions.GET_SWAP_FAILED:
        case Actions.SUBMIT_SWAP_FAILED:
            const {message} = action.payload;
            return {...state, error: message};
        default:
            return state;
    }
}

export const Execute = {
    mapStateToProps,
    mapDispatchToProps,
    reduce,
}