/**
 * App.js
 * React Application entry point
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer } from "mobx-react";
import { extendObservable, action } from "mobx";
import Reboot from "material-ui/Reboot";
import { Provider } from "mobx-react";
import { useStrict } from "mobx";
import {
  BrowserRouter as Router,
  Route,
  Redirect,
  Switch
} from "react-router-dom";
import { MuiThemeProvider, createMuiTheme } from "material-ui/styles";
import grey from "material-ui/colors/grey";
import green from "material-ui/colors/green";
import "typeface-roboto";
import GlobalStore from "./stores/GlobalStore";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Menu from "./components/Menu";
import Home from "./components/Home";
import About from "./components/About";
import Menus from "./components/Menus";
import Order from "./components/Order";
import Orders from "./components/Orders";
import Tables from "./components/Tables";
import Users from "./components/Users";
import User from "./components/User";
import Profile from "./components/Profile";
import NotFound from "./components/NotFound";
import GenericDialog from "./components/GenericDialog";

useStrict(true);

const theme = createMuiTheme({
  palette: {
    primary: {
      light: grey[300],
      main: grey[500],
      dark: grey[600]
    },
    secondary: {
      light: grey[200],
      main: grey[300],
      dark: grey[400]
    }
  }
});

const services = {
  ctx: new GlobalStore()
};

const PrivateRoute = ({ component: Component, ...rest }) => (
  <Route
    {...rest}
    render={props => {
      let id = rest.computedMatch.params.id
      return services.ctx.auth.isAuth ? (
        <Dashboard {...props} router={{ ...rest }} subComponent={Component} />
      ) : (
          <Redirect
            to={{
              pathname: "/login",
              state: { from: props.location }
            }}
          />
        )
    }
    }
  />
);

const BTB = observer(
  class extends React.Component {
    constructor(props) {
      super(props);
      extendObservable(this, {
        dialog: {
          open: false
        }
      });
      services.ctx.dialog = this.handleDialog;
    }

    handleDialog = {
      set: action((obj) => {
        for (let k in obj) {
          this.dialog[k] = obj[k];
        }
      })
    }

    handleDialogClose = action((response) => {
      this.dialog.open = false
      this.dialog.onClose(response);
    })

    render() {
      let basename = "/";

      return (
        <Provider {...services}>
          <Router basename={basename}>
            <MuiThemeProvider theme={theme}>
              <Reboot />
              <GenericDialog {...this.dialog} handleClose={this.handleDialogClose} />
              <Switch>
                <Route path="/login" component={Login} />
                <PrivateRoute path="/tables" component={Tables} />
                <PrivateRoute path="/order/:id" component={Order} />
                <PrivateRoute path="/orders" component={Orders} />
                <PrivateRoute path="/menus/:id" component={Menu} />
                <PrivateRoute path="/menus" component={Menus} />
                <PrivateRoute path="/users/:id" component={User} />
                <PrivateRoute path="/users" component={Users} />
                <PrivateRoute path="/profile" component={Profile} />
                <PrivateRoute path="/about" component={About} />
                <PrivateRoute exact path="/" component={Home} />
                <PrivateRoute component={NotFound} />
              </Switch>
            </MuiThemeProvider>
          </Router>
        </Provider>
      );
    }
  });

export default BTB;
