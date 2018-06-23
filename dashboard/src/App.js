/**
 * App.js
 * React Application entry point
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer } from "mobx-react";
import { extendObservable, action } from "mobx";
import CssBaseline from "@material-ui/core/CssBaseline";
import { Provider } from "mobx-react";
import {
  BrowserRouter as Router,
  Route,
  Redirect,
  Switch
} from "react-router-dom";
import { MuiThemeProvider, createMuiTheme } from "@material-ui/core/styles";
import grey from "@material-ui/core/colors/grey";
import "typeface-roboto";
import GlobalStore from "./stores/GlobalStore";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Menu from "./components/Menu";
import Home from "./components/Home";
import About from "./components/About";
import Menus from "./components/Menus";
import Messages from "./components/Messages";
import Order from "./components/Order";
import Orders from "./components/Orders";
import Tables from "./components/Tables";
import Users from "./components/Users";
import User from "./components/User";
import Profile from "./components/Profile";
import NotFound from "./components/NotFound";
import GenericDialog from "./components/GenericDialog";
import { accessLevels, checkUserAccessLevel } from "./utils/Roles";

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

const PrivateRoute = ({ component: Component, accessLevel: AccessLevel, ...rest }) => (
  <Route
    {...rest}
    render={props => {
      if (!services.ctx.auth.isAuth) {
        return (
          <Redirect
            to={{
              pathname: "/login",
              state: { from: props.location }
            }}
          />
        );
      } else if (AccessLevel && !checkUserAccessLevel(services.ctx.auth.user.role, AccessLevel)) {
        return (<Redirect
          to={{
            pathname: "/"
          }}
        />);
      } else {
        return (
          <Dashboard {...props} router={{ ...rest }} subComponent={Component} />
        );
      }
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
      window.Mousetrap.bind('up up down down left right left right b a enter', function () {
        alert('JK was here!');
      });
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
              <CssBaseline />
              <GenericDialog {...this.dialog} handleClose={this.handleDialogClose} />
              <Switch>
                <Route path="/login" component={Login} />
                <PrivateRoute accessLevel={accessLevels.root} path="/messages" component={Messages} />
                <PrivateRoute accessLevel={accessLevels.admin} path="/tables" component={Tables} />
                <PrivateRoute accessLevel={accessLevels.admin} path="/menus/:id" component={Menu} />
                <PrivateRoute accessLevel={accessLevels.admin} path="/menus" component={Menus} />
                <PrivateRoute accessLevel={accessLevels.admin} path="/users/:id" component={User} />
                <PrivateRoute accessLevel={accessLevels.admin} path="/users" component={Users} />
                <PrivateRoute path="/orders/:id" component={Order} />
                <PrivateRoute path="/orders" component={Orders} />
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
