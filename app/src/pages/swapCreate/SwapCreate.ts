import { AnyAction, Dispatch } from "redux";
import { RootState, SwapCreateState } from "../../common/RootState";
import { History } from 'history';
import { addAction } from "../../common/Actions";
import { AddressDetails } from "unifyre-extension-sdk/dist/client/model/AppUserProfile";
import { inject } from "../../common/IocModule";
import { P2pSwapClient, P2pSwapServiceActions } from "../../services/P2pSwapClient";

const SwapCreateActions = {
    CURRENCY_1_CHANGED: 'CURRENCY_1_CHANGED',
    CURRENCY_2_CHANGED: 'CURRENCY_2_CHANGED',
    AMOUNT_1_CHANGED: 'AMOUNT_1_CHANGED',
    AMOUNT_2_CHANGED: 'AMOUNT_2_CHANGED',
};

const Actions = SwapCreateActions;

const defaultSwapCreateState = {
    amount1: '',
    amount2: '',
    currency1: '',
    currency2: '',
} as SwapCreateState;

export interface SwapCreateProps extends SwapCreateState {
    symbol1: string;
    symbol2: string;
    balance: string;
    currencies1: { currency: string, symbol: string }[];
    currencies2: { currency: string, symbol: string }[];
}

export interface SwapCreateDispatch {
    onCurrency1Changed: (c: string) => void;
    onAmount1Changed: (a: string) => void;
    onCurrency2Changed: (c: string) => void;
    onAmount2Changed: (a: string) => void;
    onCreate: (history: History, props: SwapCreateProps) => void;
}

function filterCurrencies(cur: string, addrs: AddressDetails[]): AddressDetails[] {
    const NOT_ERC_20s = ['ETHEREUM:ETH', 'RINKEBY:ETH', 'ETHEREUM:0x9e35b147d4bf95983ffcb527ad04fbb3a9f121a4'];
    const network = !!cur ? cur.split(':')[0] : undefined;
    return addrs.filter(a => !network || a.network === network)
        .filter(a => NOT_ERC_20s.indexOf(a.currency) < 0);
}

const mapStateToProps = (root: RootState) => {
    const userProfile = root.data.userData?.profile;
    const addr = userProfile?.accountGroups[0]?.addresses || [];
    const state = root.ui.create;
    const currencies1 = filterCurrencies('', addr)
        .map(a => ({ currency: a.currency, symbol: a.symbol }));
    const currency1 = state.currency1 || (currencies1[0] || {}).currency
    const currencies2 = filterCurrencies(currency1, addr)
        .map(a => ({ currency: a.currency, symbol: a.symbol }));
    const address1 = addr.find(a => a.currency === currency1) || {} as any;
    const address2 = addr.find(a => a.currency === state.currency2) || {} as any;
    return {
        ...state,
        currency1,
        currency2: state.currency2 || (currencies2[0] || {}).currency,
        currencies1,
        currencies2,
        balance: address1.balance,
        symbol1: address1.symbol,
        symbol2: address2.symbol,
    } as SwapCreateProps;
}

const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) => ({
    onCurrency1Changed: value => dispatch(addAction(Actions.CURRENCY_1_CHANGED, {value})),
    onCurrency2Changed: value => dispatch(addAction(Actions.CURRENCY_2_CHANGED, {value})),
    onAmount1Changed: value => dispatch(addAction(Actions.AMOUNT_1_CHANGED, {value})),
    onAmount2Changed: value => dispatch(addAction(Actions.AMOUNT_2_CHANGED, {value})),
    onCreate: async (history, props) => {
        const client = inject<P2pSwapClient>(P2pSwapClient);
        const swap = await client.createSwap(
            dispatch, props.currency1, props.amount1, props.currency2, props.amount2,
            props.balance);
        if (swap) {
            history.replace(`manage/${swap.linkId}`);
        }
    },
} as SwapCreateDispatch);

function reduce(state: SwapCreateState = defaultSwapCreateState, action: AnyAction): SwapCreateState {
    switch(action.type) {
        case Actions.CURRENCY_1_CHANGED:
            return {...state, currency1: action.payload.value, error: ''};
        case Actions.CURRENCY_2_CHANGED:
            return {...state, currency2: action.payload.value, error: ''};
        case Actions.AMOUNT_1_CHANGED:
            return {...state, amount1: action.payload.value, error: ''};
        case Actions.AMOUNT_2_CHANGED:
            return {...state, amount2: action.payload.value, error: ''};
        case P2pSwapServiceActions.CREATE_SWAP_FAILED:
            return {...state, error: action.payload.message}
        default:
            return state;
    }
}

export const SwapCreate = {
    mapStateToProps,
    mapDispatchToProps,
    reduce,
}