import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { Execute, ExecuteDispatch, ExecuteProps } from "./Execute";
import {
    Page, PageTopPart, Row, Gap, ThemedText, ThemedButton, ErrorMessage, ThemedLink,
    // @ts-ignore
} from 'unifyre-web-components';
import { intl } from 'unifyre-react-helper';
import { formatter } from '../../services/RatesService';
import { useHistory, useParams } from 'react-router-dom';
import { Utils } from '../../common/Utils';
import { Network } from 'ferrum-plumbing';
import { History } from 'history';

function TopPart() {
    return (
        <PageTopPart>
            <Gap />
            <Row withPadding centered>
                <ThemedText.H3>{intl('execute-swap')}</ThemedText.H3>
            </Row>
        </PageTopPart>
    );
}

export function ApproveLink(props: {currency: string, onOpenApprove: (history: History, currency: string) => void }) {
    const history = useHistory();
    return (
        <>
            <Row withPadding centered>
                <ThemedLink text={intl('approve-link')}
                    onClick={() => props.onOpenApprove(history, props.currency)} />
            </Row>
        </>
    );
}

export function Transactions(props: {network: Network, pendingTransactionId?: string, transactionIds: string[]}) {
    const pending = props.pendingTransactionId ? (
        <>
            <Row withPadding>
                <ThemedText.H3>{intl('pending-transaction')}</ThemedText.H3>
            </Row>
            <Row withPadding>
                <ThemedLink text={Utils.shorten(props.pendingTransactionId)}
                    onClick={() => window.open(
                        Utils.linkForTransaction(props.network, props.pendingTransactionId!), '_blank')} />
            </Row>
        </>
    ) : undefined;
    const allTxs = !!(props.transactionIds || []).length ? (
        <>
            <Row withPadding>
                <ThemedText.H3>{intl('all-transactions')}</ThemedText.H3>
            </Row>
            {props.transactionIds!.map((tid, idx) => (
                <Row withPadding key={idx}>
                    <ThemedLink text={Utils.shorten(tid)}
                        onClick={() => window.open(
                            Utils.linkForTransaction(props.network, tid), '_blank')} />
                </Row>
            ))}
        </>
        ) : undefined;
    return (
        <>
            {pending}
            {allTxs}
        </>
    );
}

export function SwapView(props: {
        executed: boolean, canceled: boolean, pendingCancellation: boolean,
        amount1: string, amount2: string, symbol1: string, symbol2: string}) {
    const executed = props.executed ? (
        <>
            <Row withPadding centered>
                <ThemedText.H2>{intl('executed-msg')}</ThemedText.H2>
            </Row>
        </>
    ) : undefined;
    const canceled = props.canceled ? (
        <>
            <Row withPadding centered>
                <ThemedText.H2>{intl('canceled-msg')}</ThemedText.H2>
            </Row>
        </>
    ) : undefined;
    const canceling = !props.canceled && props.pendingCancellation ? (
        <>
            <Row withPadding centered>
                <ThemedText.H2>{intl('canceling-msg')}</ThemedText.H2>
            </Row>
        </>
    ) : undefined;
    return (
        <>
            <Gap />
            <Row withPadding>
                <ThemedText.H3>{intl('swap-sending')}</ThemedText.H3>
            </Row>
            <Row withPadding>
                <ThemedText.H2>{`${props.amount2 || ''} ${props.symbol2 || ''}`}</ThemedText.H2>
            </Row>
            <Row withPadding>
                <ThemedText.H3>{intl('swap-receiving')}</ThemedText.H3>
            </Row>
            <Row withPadding>
                <ThemedText.H2>{`${props.amount1 || ''} ${props.symbol1 || ''}`}</ThemedText.H2>
            </Row>
            <Gap />
            {executed}
            {canceled}
            {canceling}
        </>
    );
}

function ExecuteComponent(props: ExecuteProps&ExecuteDispatch) {
    const canSign = !props.canceled && !props.executed && !props.pendingCancellation &&
        !props.pendingTransactionId;
    const {linkId} = useParams<{linkId: string}>();
    const {onLoad, userId} = props;
    const history = useHistory();
    useEffect(() => {
        if (!!linkId) {
            onLoad(history, userId, linkId);
        }
    }, [onLoad, userId, linkId]);
    const error = props.error ? (
        <Row withPadding>
            <ErrorMessage text={props.error} />
        </Row>
    ) : undefined;
    if (props.error && props.linkNotFound) {
        return (
            <>
              <TopPart />
              <Gap />
              {error}
            </>
        )
    };
    const balance = canSign && props.balance ? (
        <>
            <Gap />
            <Row withPadding>
                <ThemedText.H3>{intl('balance')}</ThemedText.H3>
            </Row>
            <Row withPadding>
                <ThemedText.H2>{formatter.format(props.balance, false)} {props.symbol2}</ThemedText.H2>
            </Row>
        </>
    ) : undefined;
    const btn = canSign ? (
        <Row withPadding>
            <ThemedButton text={intl('sign-and-execute')}
                disabled={!props.bothCurrenciesEnabled}
                onClick={() => props.onExecute(props)}
            />
        </Row>
    ) : undefined;
    const currenciesWarning = props.bothCurrenciesEnabled ? undefined : (
        <Row withPadding>
            <ThemedText.P>{intl('currencies-not-enabled-warning', {
                currency1: props.symbol1 || '', currency2: props.symbol2 || '' })}</ThemedText.P>
        </Row>
    )
    const pendingTxWaring = !!props.pendingTransactionId ? (
        <Row withPadding>
            <ThemedText.P>{intl('pending-transaction-warning')}</ThemedText.P>
        </Row>
    ) : undefined;
    return (
        <Page>
            <TopPart />
            <SwapView {...props} />
            {balance}
            {currenciesWarning}
            {pendingTxWaring}
            {error}
            {btn}
            <ApproveLink {...props} />
            <Gap />
            <Transactions {...props} />
            <Gap />
            <Gap />
        </Page>
    );
}

export const ExecuteContainer = connect(Execute.mapStateToProps, Execute.mapDispatchToProps)(
    ExecuteComponent
);