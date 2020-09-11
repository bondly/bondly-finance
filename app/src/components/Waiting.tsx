import React from 'react';
import { RootState } from '../common/RootState';
import { connect } from 'react-redux';
import {
    Waiting,
    // @ts-ignore
} from 'unifyre-web-components';

interface WaitingProps { waiting: boolean, msg: string }

function WaitingComponent(props: WaitingProps) {

    return (
        <Waiting show={props.waiting} message={props.msg} />
    )
}

function mapStateToProps(state: RootState): WaitingProps {
    return { waiting: state.ui.flags.waiting, msg: state.ui.flags.waitingMsg };
}

export const WaitingContainer = connect(mapStateToProps, () => ({}))(WaitingComponent);