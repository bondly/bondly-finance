import { combineReducers, AnyAction } from "redux";
import { Dashboard } from "../pages/dashboard/Dashboard";
import { CommonActions } from "./Actions";
import { userPreferenceReducer } from "../services/UserPreferenceService";
import { AppUserProfile } from "unifyre-extension-sdk/dist/client/model/AppUserProfile";
import { activeSwapReducer, currentSwapReducer, P2pSwapServiceActions } from "../services/P2pSwapClient";
import { SwapCreate } from "../pages/swapCreate/SwapCreate";
import { Manage } from "../pages/manage/Manage";
import { Execute } from "../pages/execute/Execute";
import { Approve } from "../pages/approve/Approve";

function flags(state: { waiting: boolean, waitingMsg: string } = { waiting: false, waitingMsg: '' },
        action: AnyAction) {
    switch (action.type) {
        case CommonActions.WAITING:
            const waitingMsg = action.payload.message;
            return { waiting: true, waitingMsg };
        case CommonActions.WAITING_DONE:
            return { waiting: false, waitingMsg: '', };
        default:
            return state;
    }
}

function userData(state: { userProfile: AppUserProfile } = {} as any, action: AnyAction) {
    switch(action.type) {
        case P2pSwapServiceActions.USER_DATA_RECEIVED:
            const {userProfile} = action.payload;
            return {...state, profile: userProfile};
        default:
            return state;
    }
}

const data = combineReducers({
    userData,
    userPreference: userPreferenceReducer,
    currentSwap: currentSwapReducer,
    activeSwaps: activeSwapReducer,
});

const ui = combineReducers({
    flags,
    dashboard: Dashboard.reduce,
    create: SwapCreate.reduce,
    manage: Manage.reduce,
    execute: Execute.reduce,
    approve: Approve.reduce,
});

export const rootReducer = combineReducers({ data, ui });
