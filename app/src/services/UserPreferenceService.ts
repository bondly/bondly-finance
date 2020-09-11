import { Injectable } from "ferrum-plumbing";
import { defaultUserPreference, UserPreference } from "../common/RootState";
import { Dispatch } from "react";
import { AnyAction } from "redux";
import { addAction } from "../common/Actions";

const USER_PREFERENCE_STORAGE_KEY = 'USER_PREFERENCE';
const UserPreferenceActions = {
    USER_PREFERENCE_LOADED: 'USER_PREFERENCE_LOADED',
}

export class UserPreferenceService implements Injectable {
    private pref: UserPreference = defaultUserPreference;
    constructor() {
        // Load
        const strLoaded = localStorage.getItem(USER_PREFERENCE_STORAGE_KEY);
        try {
            if (strLoaded) {
                this.pref = JSON.parse(strLoaded);
            }
        } catch (e) { console.error('UserPreferenceService', e); }
    }

    init(dispatch: Dispatch<AnyAction>) {
        const userPreference = this.pref;
        dispatch(addAction(UserPreferenceActions.USER_PREFERENCE_LOADED, { userPreference }));
    }

    update(dispatch: Dispatch<AnyAction>, up: Partial<UserPreference>) {
        const userPreference = {...this.pref, ...up};
        this.pref = userPreference;
        localStorage.setItem(USER_PREFERENCE_STORAGE_KEY, JSON.stringify(this.pref));
        dispatch(addAction(UserPreferenceActions.USER_PREFERENCE_LOADED, { userPreference }));
    }

    __name__() { return 'UserPreferenceService'; }
}

export function userPreferenceReducer(state: UserPreference = defaultUserPreference, action: AnyAction) {
    switch(action.type) {
        case UserPreferenceActions.USER_PREFERENCE_LOADED:
            const {userPreference} = action.payload;
            return {...userPreference};
        default:
            return state;
    }
}