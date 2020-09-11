import React from 'react';
import {
    Page, PageTopPart, Row, Gap, ThemedText, ThemedButton, InputGroupAddon, ErrorMessage,
    InputDropDown,
    // @ts-ignore
} from 'unifyre-web-components';
import { intl } from 'unifyre-react-helper';
import { SwapCreate, SwapCreateDispatch, SwapCreateProps } from './SwapCreate';
import { useHistory } from 'react-router';
import { formatter } from '../../services/RatesService';
import { connect } from 'react-redux';

function SwapCreateComponent(props: SwapCreateProps&SwapCreateDispatch) {
    const history = useHistory();
    const error = props.error ? (
        <Row withPadding>
            <ErrorMessage text={props.error} />
        </Row>
    ) : undefined;
    const balance = (
        <>
            <Gap />
            <Row withPadding>
                <ThemedText.H3>{intl('balance')}</ThemedText.H3>
            </Row>
            <Row withPadding>
                <ThemedText.H2>{formatter.format(props.balance, false)} {props.symbol1}</ThemedText.H2>
            </Row>
        </>
    );
    const currency1Selector = (
        <Row withPadding>
        <InputDropDown
            items={props.currencies1.map(c => ({key: c.currency, label: c.symbol}))}
            selectedKey={props.currency1}
            onItemSelected={(key: string) => props.onCurrency1Changed(key)}
            itemRenderer={(item: any) => <span>{item.label}</span>}
        />
        </Row>
    );
    const currency2Selector = (
        <Row withPadding>
        <InputDropDown
            items={props.currencies2.map(c => ({key: c.currency, label: c.symbol}))}
            selectedKey={props.currency2}
            onItemSelected={(key: string) => props.onCurrency2Changed(key)}
            itemRenderer={(item: any) => <span>{item.label}</span>}
        />
        </Row>
    );
    const swapNote = (
        <>
        <Row withPadding>
            <ThemedText.P>{intl('create-swap-notes')}</ThemedText.P>
        </Row>
        </>
    );
    return (
        <Page>
            <PageTopPart>
                <Gap />
                <Row withPadding centered>
                    <ThemedText.H3>{intl('create-swap')}</ThemedText.H3>
                </Row>
            </PageTopPart>
            <Gap />
            <Row withPadding>
                <ThemedText.SMALL>{intl('swap-sending')}</ThemedText.SMALL>
            </Row>
            {currency1Selector}
            <Row withPadding>
                <InputGroupAddon
                    value={props.amount1}
                    onChange={props.onAmount1Changed}
                    inputMode={'decimal'}
                />
            </Row>
            {balance}
            <Row withPadding>
                <ThemedText.SMALL>{intl('swap-receiving')}</ThemedText.SMALL>
            </Row>
            {currency2Selector}
            <Row withPadding>
                <InputGroupAddon
                    value={props.amount2}
                    onChange={props.onAmount2Changed}
                    inputMode={'decimal'}
                />
            </Row>
            {error}
            <Row withPadding>
                <ThemedButton text={intl('create-swap-btn')} onClick={() => props.onCreate(history, props)} />
            </Row>
            {swapNote}
            <Gap />
            <Gap />
            <Gap />
        </Page>
    );
}

export const SwapCreateContainer = connect(SwapCreate.mapStateToProps, SwapCreate.mapDispatchToProps) (
    SwapCreateComponent
);
