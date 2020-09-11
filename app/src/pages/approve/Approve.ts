import { Network } from "ferrum-plumbing";
import { AnyAction, Dispatch } from "redux";
import { inject } from "../../common/IocModule";
import { ApproveState, RootState } from "../../common/RootState";
import { Utils } from "../../common/Utils";
import { P2pSwapClient, P2pSwapServiceActions } from "../../services/P2pSwapClient";
import { formatter } from "../../services/RatesService";
import { addAction } from "../../common/Actions";

const ApproveActions = {
    APPROVE_AMOUNT_CHANGED: 'APPROVE_AMOUNT_CHANGED',
    APPROVE_COMPLETED: 'APPROVE_COMPLETED',
};
const Actions = P2pSwapServiceActions;

export interface ApproveProps extends ApproveState {
    network: Network;
    userId: string;
    linkId: string;
    symbol: string;
    amount: string;
    currencyEnabled: boolean;
    error?: string;
    transactionIds: string[];
}

export interface ApproveDispatch {
    onSubmit: (props: ApproveProps) => void;
    onAmountChanged: (amount: string) => void;
}

const mapStateToProps = (root: RootState) => {
    const state = root.ui.approve;
    const user = root.data.userData.profile;
    const swap = root.data.currentSwap;
    const addr = Utils.getUserAddresses(user, state.currency)! || {} as any;
    return {
        ...state,
        network: swap.network,
        linkId: swap.linkId,
        currencyEnabled: !!addr.currency,
        userId: root.data.userData.profile.userId,
        amount: state.amount,
        symbol: addr.symbol,
        transactionIds: swap.allTransactions || [],
        error: state.error,
    } as ApproveProps;
}

const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) => ({
    onSubmit: async props => {
        const client = inject<P2pSwapClient>(P2pSwapClient);
        const approve = await client.approve(dispatch, props.linkId, props.currency, props.amount);
        if (approve) {
            dispatch(addAction(ApproveActions.APPROVE_COMPLETED, {}));
        }
    },
    onAmountChanged: value => dispatch(addAction(ApproveActions.APPROVE_AMOUNT_CHANGED, {value})),
} as ApproveDispatch);

const defaultApproveState = {
    amount: '',
    currency: '',
    linkNotFound: false,
    transactionSubmitted: false,
} as ApproveState;

function reduce(state: ApproveState = defaultApproveState, action: AnyAction): ApproveState {
    switch(action.type) {
        case ApproveActions.APPROVE_AMOUNT_CHANGED:
            return {...state, amount: action.payload.value, error: ''};
        case ApproveActions.APPROVE_COMPLETED:
            return {...state, error: undefined, linkNotFound: true, transactionSubmitted: true};
        case Actions.APPROVE_FAILED:
            const {message} = action.payload;
            return {...state, error: message};
        case Actions.SELECT_APPROVE_CURRENCY:
            return {...state, currency: action.payload.value};
        default:
            return state;
    }
}

export const Approve = {
    mapStateToProps,
    mapDispatchToProps,
    reduce,
}