import React, {useEffect} from 'react';
import { DashboardDispatch, Dashboard } from './Dashboard';
import { Switch, Route, useHistory } from 'react-router-dom';
import {
    Page, Row, ThemedText, Gap,
    // @ts-ignore
} from 'unifyre-web-components';
import { connect } from 'react-redux';
import { DashboardProps } from '../../common/RootState';
import { intl } from 'unifyre-react-helper';
import { Utils } from '../../common/Utils';
import { CONFIG } from '../../common/IocModule';
import { ExecuteContainer } from '../execute/ExecuteContainer';
import { SwapCreateContainer } from '../swapCreate/SwapCreateContainer';
import { ManageContainer } from '../manage/ManageContainer';
import { ApproveContainer } from '../approve/ApproveContainer';

function DashboardComponent(props: DashboardProps&DashboardDispatch) {
    const {activeSwap, onLoad, onLoadLink} = props;
    const history = useHistory();
    const linkId = Utils.getQueryparam('linkId');
    useEffect(() => {
        onLoad().then(res => {
          if (!!res && !!linkId) {
            onLoadLink(history, res.userId, linkId!);
          }
        });
    }, [onLoad, onLoadLink, linkId, history]);

    useEffect(() => {
      if (activeSwap && !linkId && !(window.location.pathname || '').startsWith('/execute') ) {
        history.replace(`/manage/${activeSwap}`);
      }
    }, [activeSwap, linkId, history]);
    const testAlert = CONFIG.isProd ? undefined : (<><Row withPadding><ThemedText.H1>TEST MODE</ThemedText.H1></Row></>)
    if (props.initialized) {
        // Render the routes
        return (
            <>
              {testAlert}
              <Switch>
                <Route path='/execute/:linkId'>
                  <ExecuteContainer />
                </Route>
                <Route path='/manage/:linkId'>
                  <ManageContainer />
                </Route>
                <Route path='/approve'>
                  <ApproveContainer />
                </Route>
                <Route path='/'>
                  {!!linkId ? <ExecuteContainer /> : <SwapCreateContainer />}
                </Route>
              </Switch>
            </>
        );
    }

    const fatalError = props.fatalError ? (
      <>
        <Row withPadding centered>
          <ThemedText.H2 >{intl('fatal-error-heading')}</ThemedText.H2>
        </Row>
        <Row withPadding centered>
          <ThemedText.H3 >{props.fatalError}</ThemedText.H3>
        </Row>
      </>
    ) : (
      <Row withPadding centered>
          <ThemedText.H2>Connecting...</ThemedText.H2>
      </Row>
    );

    return (
        <Page>
            {testAlert}
            <Gap />
            <Gap />
            <Gap />
            <Gap />
            {fatalError}
        </Page>
    );
}

export const DashboardContainer = connect(
  Dashboard.mapStateToProps, Dashboard.mapDispatchToProps)(DashboardComponent);