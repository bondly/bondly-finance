import { AnyAction, Dispatch } from "redux";
import { addAction } from "../../common/Actions";
import { inject } from "../../common/IocModule";
import { ManageState, RootState } from "../../common/RootState";
import { Utils } from "../../common/Utils";
import { P2pSwapClient, P2pSwapServiceActions } from "../../services/P2pSwapClient";
import { Execute, ExecuteProps } from "../execute/Execute";
import { History } from 'history';

const BASE_LINK_URL = 'https://u.linkdrop.us/app';

export const ManageActions = {

};

const Actions = P2pSwapServiceActions;

export interface ManageProps extends ExecuteProps {
    linkUrl: string;
}

export interface ManageDispatch {
    onLoad: (userId: string, linkId: string) => void;
    onClose: (linkId: string) => void;
    onCancel: (linkId: string) => void;
    onSubmit: (linkId: string) => void;
    onOpenApprove: (history: History, currency: string) => void;
}

const mapStateToProps = (root: RootState) => {
    const state = root.ui.manage;
    const props = Execute.mapStateToProps(root);
    const user = root.data.userData.profile;
    const swap = root.data.currentSwap;
    const addr1 = Utils.getUserAddresses(user, swap.currency1)! || {} as any;
    const linkUrl = `${BASE_LINK_URL}/${swap.linkId}`;
    return {
        ...props,
        ...state,
        balance: addr1.balance,
        currency: addr1.currency,
        linkUrl,
    } as ManageProps;
}

const mapDispatchToProps = (dispatch: Dispatch<AnyAction>) => ({
    onLoad: async (userId, linkId) => {
        const client = inject<P2pSwapClient>(P2pSwapClient);
        const swap = await client.getSwap(dispatch, linkId);
        if (!!swap && swap.userId1 !== userId) {
            dispatch(addAction(Actions.SUBMIT_SWAP_FAILED, {message: 'You cannot manage this swap'}));
        }
    },
    onCancel: async linkId => {
        const client = inject<P2pSwapClient>(P2pSwapClient);
        return client.submitCancelSwap(dispatch, linkId);
    },
    onSubmit: async linkId => {
        try {
            const client = inject<P2pSwapClient>(P2pSwapClient);
            const sub = await client.submitSwap(dispatch, linkId);
        } catch (e) {
            console.error('onSubmit', e);
            dispatch(addAction(Actions.SUBMIT_SWAP_FAILED, {message: e.message}));
        }
    },
    onClose: async linkId => {
        const client = inject<P2pSwapClient>(P2pSwapClient);
        return client.closeSwap(dispatch, linkId);
    },
    onOpenApprove: async (history, currency) => {
        dispatch(addAction(Actions.SELECT_APPROVE_CURRENCY, { value: currency }));
        history.push('/approve');
    },
} as ManageDispatch);

function reduce(state: ManageState = { linkNotFound: false }, action: AnyAction) {
    switch(action.type) {
        case Actions.SWAP_NOT_FOUND:
            return {...state, error: action.payload.message, linkNotFound: true}
        case Actions.GET_SWAP_FAILED:
        case Actions.SUBMIT_SWAP_FAILED:
        case Actions.CLOSE_SWAP_FAILED:
            const {message} = action.payload;
            return {...state, error: message};
        default:
            return state;
    }
}

export const Manage = {
    mapDispatchToProps,
    mapStateToProps,
    reduce,
}