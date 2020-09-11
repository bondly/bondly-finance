import React from 'react';
import {
    Page, PageTopPart, Row, Gap, ThemedText, ThemedButton, ErrorMessage,
    InputCurrency,
    // @ts-ignore
} from 'unifyre-web-components';
import { intl } from 'unifyre-react-helper';
import { connect } from 'react-redux';
import { Approve, ApproveDispatch, ApproveProps } from './Approve';
import { Transactions } from '../execute/ExecuteContainer';
import { formatter } from '../../services/RatesService';

function ApproveComponent(props: ApproveProps&ApproveDispatch) {
    const error = props.error ? (
        <Row withPadding>
            <ErrorMessage text={props.error} />
        </Row>
    ) : undefined;
    const approveNote = (
        <>
        <Row withPadding>
            <ThemedText.P>{intl('approve-notes-1')}</ThemedText.P>
        </Row>
        <Row withPadding>
            <ThemedText.P>{intl('approve-notes-2')}</ThemedText.P>
        </Row>
        </>
    );
    const content = props.transactionSubmitted ? (
        <>
            <Row withPadding>
                <ThemedText.H2>{intl('approve-submitted')}</ThemedText.H2>
            </Row>
        </>
    ) : (
        <>
            <Row withPadding>
                <ThemedText.SMALL>{intl('approve-amount')}</ThemedText.SMALL>
            </Row>
            <Row withPadding>
                <InputCurrency
                    currencies={[{ label: props.symbol, key: props.currency }]}
                    amountStr={props.amount}
                    onAmountChanged={props.onAmountChanged}
                    curreny={props.currency}
                    onCurrencyChanged={() => { }}
                    autoFocus={true}
                    formatter={formatter}
                    inputMode={'decimal'}
                />
            </Row>
            {error}
            <Row withPadding>
                <ThemedButton text={intl('submit-approve')} onClick={() => props.onSubmit(props)} />
            </Row>
        </>
    );
    return (
        <Page>
            <PageTopPart>
                <Gap />
                <Row withPadding centered>
                    <ThemedText.H3>{intl('approve-title', { symbol: props.symbol })}</ThemedText.H3>
                </Row>
            </PageTopPart>
            <Gap />
            {content}
            {approveNote}
            <Gap />
            <Transactions {...props} />
            <Gap />
            <Gap />
        </Page>
    );
}

export const ApproveContainer = connect(Approve.mapStateToProps, Approve.mapDispatchToProps) (
    ApproveComponent
);
