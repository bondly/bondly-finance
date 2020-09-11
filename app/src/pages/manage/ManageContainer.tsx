
import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import {
    Page, PageTopPart, Row, Gap, ThemedText, ThemedButton, ErrorMessage,
    // @ts-ignore
} from 'unifyre-web-components';
import { intl } from 'unifyre-react-helper';
import { formatter } from '../../services/RatesService';
import { Manage, ManageDispatch, ManageProps } from './Manage';
import { ApproveLink, SwapView, Transactions } from '../execute/ExecuteContainer';
import { useParams } from 'react-router';
import CopyToClipboard from 'react-copy-to-clipboard';
import { useAlert } from 'react-alert';

function ManageComponent(props: ManageProps&ManageDispatch) {
    const canCancell = !props.canceled && !props.executed && !props.pendingCancellation;
    const canSign = !props.canceled && !props.executed && !props.pendingCancellation &&
        !props.submitted && !props.submiting;
    const {linkId} = useParams<{linkId: string}>();
    const {onLoad, userId} = props;
    useEffect(() => {
        onLoad(userId, linkId);
    }, [onLoad, userId, linkId]);
    const alert = useAlert();
    const error = props.error ? (
        <Row withPadding>
            <ErrorMessage text={props.error} />
        </Row>
    ) : undefined;
    const balance = canSign ? (
        <>
            <Gap />
            <Row withPadding>
                <ThemedText.H3>{intl('balance')}</ThemedText.H3>
            </Row>
            <Row withPadding>
                <ThemedText.H2>{formatter.format(props.balance, false)} {props.symbol1}</ThemedText.H2>
            </Row>
        </>
    ) : undefined;
    const btn = canSign ? (
        <Row withPadding>
            <ThemedButton text={intl('sign-and-execute')}
                disabled={!props.bothCurrenciesEnabled || !!props.error}
                onClick={() => props.onSubmit(props.linkId)}
            />
        </Row>
    ) : undefined;
    const close = canSign && !(props.transactionIds || []).length ? (
        <Row withPadding>
            <ThemedButton text={intl('close-btn')}
                disabled={!!props.error}
                onClick={() => props.onClose(props.linkId)}
            />
        </Row>
    ) : undefined;
    const cancel = canCancell && (
        !!(props.transactionIds || []).length || props.submitted // In case txIds were not recorded
        ) ? (
        <>
        <Row withPadding>
            <ThemedButton text={intl('cancel-btn')}
                disabled={!props.bothCurrenciesEnabled || !!props.error}
                onClick={() => props.onCancel(props.linkId)}
            />
        </Row>
        <Row withPadding>
            <ThemedText.P>{intl('cancel-btn-comments')}</ThemedText.P>
        </Row>
        </>
    ) : undefined;
    const link = canCancell && (props.submitted || props.submiting) ? (
        <>
            <Row withPadding>
                <CopyToClipboard text={props.linkUrl}>
                    <ThemedButton text={intl('btn-copy-to-clipboard')}
                        highlight={true}
                        onClick={() => alert.success(intl('copied'))} />
                </CopyToClipboard>
            </Row>
        </>
    ) : undefined;
    const currenciesWarning = props.bothCurrenciesEnabled ? undefined : (
        <Row withPadding>
            <ThemedText.P>{intl('currencies-not-enabled-warning', {
                currency1: props.symbol1 || '', currency2: props.symbol2 || '' })}</ThemedText.P>
        </Row>
    )
    const swapViewProps = {...props, amount1: props.amount2, amount2: props.amount1,
        symbol1: props.symbol2, symbol2: props.symbol1};
    return (
        <Page>
            <PageTopPart>
                <Gap />
                <Row withPadding centered>
                    <ThemedText.H3>{intl('manage-swap-title')}</ThemedText.H3>
                </Row>
            </PageTopPart>
            <SwapView {...swapViewProps} />
            {balance}
            {currenciesWarning}
            {error}
            {link}
            {btn}
            {close}
            {cancel}
            <ApproveLink {...props} />
            <Gap />
            <Transactions {...props} />
            <Gap />
            <Gap />
        </Page>
    )
}

export const ManageContainer = connect(Manage.mapStateToProps, Manage.mapDispatchToProps)(
    ManageComponent
);