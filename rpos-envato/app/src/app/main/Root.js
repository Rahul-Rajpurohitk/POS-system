import React from 'react';
import {Provider} from 'react-redux';
import {createStore, applyMiddleware, compose} from 'redux';
import thunkMiddleware from 'redux-thunk';
import {composeWithDevTools} from 'redux-devtools-extension';
import 'moment/min/locales';

import App from './App';
import reducers from '../reducers';

import {persistStore} from 'redux-persist';
import {PersistGate} from 'redux-persist/es/integration/react';

const middleware = [thunkMiddleware];
const store = composeWithDevTools(applyMiddleware(...middleware))(createStore)(
  reducers,
);

let persistor = persistStore(store);

if (__DEV__) {
  import('./ReactotronConfig').then(() => console.log('Reactotron Configured'));
}

class Root extends React.Component {
  render() {
    return (
      <Provider store={store}>
        <PersistGate persistor={persistor}>
          <App />
        </PersistGate>
      </Provider>
    );
  }
}

export default Root;
