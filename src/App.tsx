import React from 'react';
import { Layout, Spin } from "antd";
import { BrowserRouter, Switch, Route, Redirect } from "react-router-dom";
import NavbarComponent from './components/Navbar';
import './App.less';
import CustomSpinner from './components/CustomSpinner';
import AddressBook from './components/AddressBook';
import Configuration from './components/Configuration';
import AverageBlockTime from './components/AverageBlockTime';
import BlockTime from './components/BlockTime';
import BlockAuthor from './components/BlockAuthor';
import { useAppSelector } from './store/hooks';

function App(): React.ReactElement {
  const isLoading = useAppSelector((state) => state.address.isLoading);

  return (
    <BrowserRouter>
      <Spin spinning={isLoading} indicator={CustomSpinner}>
        <Layout className="app-layout">
          <NavbarComponent />
          <Layout.Content className="app-content">
            <Switch>
              <Route exact path="/address-book" component={AddressBook} />
              <Route exact path="/average-block-time" component={AverageBlockTime} />
              <Route exact path="/block-time" component={BlockTime} />
              <Route exact path="/block-author" component={BlockAuthor} />
              <Route exact path="/config" component={Configuration} />              
              <Redirect to="/address-book"/>
            </Switch>
          </Layout.Content>
        </Layout>
      </Spin>
    </BrowserRouter>
  );
}

export default App;
