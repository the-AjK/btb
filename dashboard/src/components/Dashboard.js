/**
 * Dashboard.js
 * Dashboard component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import Link from "./Link";
import { observer, inject } from "mobx-react";
import PropTypes from "prop-types";
import { withStyles } from "material-ui/styles";
import Drawer from "material-ui/Drawer";
import AppBar from "material-ui/AppBar";
import Toolbar from "material-ui/Toolbar";
import List, { ListItem, ListItemIcon } from "material-ui/List";
import Typography from "material-ui/Typography";
import IconButton from "material-ui/IconButton";
import Hidden from "material-ui/Hidden";
import Divider from "material-ui/Divider";
import MenuIcon from "material-ui-icons/Menu";
import AssignmentIcon from "material-ui-icons/Assignment";
import HomeIcon from "material-ui-icons/Home";
import StorageIcon from "material-ui-icons/Storage";
import UsersIcon from "material-ui-icons/Group";
import TablesIcon from "material-ui-icons/Widgets";
import ProfileIcon from "material-ui-icons/Person";
import AboutIcon from "material-ui-icons/Info";
import LogoutIcon from "material-ui-icons/Launch"
import SettingsIcon from "material-ui-icons/Settings"
import AccountCircle from 'material-ui-icons/AccountCircle';
import Menu, { MenuItem } from 'material-ui/Menu';
import { accessLevels, checkUserAccessLevel } from '../utils/Roles';
import Grid from "material-ui/Grid";

import BenderBottom from "./ee/BenderBottom"

const drawerWidth = 180;

const styles = theme => ({
  root: {
    flexGrow: 1,
    height: "100%",
    zIndex: 1,
    overflow: "hidden",
    position: "relative",
    display: "flex",
    width: "100%"
  },
  flex: {
    flex: 1
  },
  appBar: {
    position: "absolute",
    marginLeft: drawerWidth,
    zIndex: 2000
  },
  navIconHide: {
    [theme.breakpoints.up("md")]: {
      display: "none"
    }
  },
  toolbar: theme.mixins.toolbar,
  drawerPaper: {
    width: drawerWidth,
    [theme.breakpoints.up("md")]: {
      position: "relative"
    },
  },
  content: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.default,
    paddingTop: theme.spacing.unit * 1,
    paddingBottom: theme.spacing.unit * 3,
    paddingLeft: theme.spacing.unit * 3,
    paddingRight: theme.spacing.unit * 3,
    [theme.breakpoints.up("md")]: {
      width: `calc(100% - ${drawerWidth}px)`
    },
    overflow: "auto",
    height: "100vh"
  },
  profileMenuIcon: {
    margin: theme.spacing.unit
  },
  profileMenuItem: {
    marginRight: theme.spacing.unit
  },
});

const Dashboard = inject("ctx")(
  observer(
    class extends React.Component {

      state = {
        mobileOpen: false,
        anchorEl: null,
      };

      handleDrawerToggle = () => {
        this.setState({ mobileOpen: !this.state.mobileOpen });
      };

      handleMenu = event => {
        this.setState({ anchorEl: event.currentTarget });
      };

      handleClose = () => {
        this.setState({ anchorEl: null });
      };

      handleProfile = () => {
        this.props.ctx.history.push('/profile');
        this.setState({ anchorEl: null });
      };

      handleAbout = () => {
        this.props.ctx.history.push('/about');
        this.setState({ anchorEl: null });
      };

      handleLogout = () => {
        this.props.ctx.auth.logout(() => {
          this.setState({ anchorEl: null });
          this.props.history.push('/login');
        });
      }

      render() {
        this.props.ctx.history = this.props.history;
        const { classes, theme } = this.props;
        const { anchorEl } = this.state;
        const open = Boolean(anchorEl),
          SubComponent = this.props.subComponent,
          roles = this.props.ctx.roles;

        const drawer = (
          <div>
            <div className={classes.toolbar} />
            <Divider />
            <List>
              <ListItem button onClick={() => this.props.history.push('/')}>
                <ListItemIcon>
                  <HomeIcon />
                </ListItemIcon>
                <ListItem>
                  Home
                </ListItem>
              </ListItem>
              <ListItem button onClick={() => this.props.history.push('/menus')}>
                <ListItemIcon>
                  <AssignmentIcon />
                </ListItemIcon>
                <ListItem>
                  Menus
                </ListItem>
              </ListItem>
              <ListItem button onClick={() => this.props.history.push('/orders')}>
                <ListItemIcon>
                  <StorageIcon />
                </ListItemIcon>
                <ListItem>
                  Orders
                </ListItem>
              </ListItem>
              <ListItem button onClick={() => this.props.history.push('/tables')}>
                <ListItemIcon>
                  <TablesIcon />
                </ListItemIcon>
                <ListItem>
                  Tables
                </ListItem>
              </ListItem>
            </List>
            <Divider />
            <List>
              <ListItem button onClick={() => this.props.history.push('/users')}>
                <ListItemIcon>
                  <UsersIcon />
                </ListItemIcon>
                <ListItem>
                  Users
                </ListItem>
              </ListItem>
            </List>
            {roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root) && <div>
              <Divider />
              <List>
                <ListItem button onClick={() => this.props.history.push('/settings')}>
                  <ListItemIcon>
                    <SettingsIcon />
                  </ListItemIcon>
                  <ListItem>
                    Settings
                  </ListItem>
                </ListItem>
              </List>
            </div>}
          </div>
        );

        return (
          <div className={classes.root}>
            <AppBar className={classes.appBar} color={"secondary"}>
              <Toolbar>
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  onClick={this.handleDrawerToggle}
                  className={classes.navIconHide}
                >
                  <MenuIcon />
                </IconButton>
                <Typography variant="title" color="inherit" noWrap className={classes.flex}>
                  BiteTheBot
                </Typography>

                <div>
                  <IconButton
                    aria-owns={open ? 'menu-appbar' : null}
                    aria-haspopup="true"
                    onClick={this.handleMenu}
                    color="inherit"
                    title={"[" + this.props.ctx.auth.user.role.title + "] " + this.props.ctx.auth.user.email}
                  >
                    <AccountCircle />
                  </IconButton>
                  <Menu
                    id="menu-appbar"
                    anchorEl={anchorEl}
                    anchorOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    transformOrigin={{
                      vertical: 'top',
                      horizontal: 'right',
                    }}
                    open={open}
                    onClose={this.handleClose}
                  >
                    <MenuItem className={classes.profileMenuItem} onClick={this.handleProfile}><ProfileIcon className={classes.profileMenuIcon} /> Profile</MenuItem>
                    <MenuItem className={classes.profileMenuItem} onClick={this.handleAbout}><AboutIcon className={classes.profileMenuIcon} /> About</MenuItem>
                    <Divider />
                    <MenuItem className={classes.profileMenuItem} onClick={this.handleLogout} ><LogoutIcon className={classes.profileMenuIcon} /> Logout</MenuItem>
                  </Menu>
                </div>
              </Toolbar>
            </AppBar>
            <Hidden mdUp>
              <Drawer
                variant="temporary"
                anchor={theme.direction === "rtl" ? "right" : "left"}
                open={this.state.mobileOpen}
                onClose={this.handleDrawerToggle}
                classes={{
                  paper: classes.drawerPaper
                }}
                ModalProps={{
                  keepMounted: true // Better open performance on mobile.
                }}
              >
                {drawer}
              </Drawer>
            </Hidden>
            <Hidden smDown implementation="css">
              <Drawer
                variant="permanent"
                open
                classes={{
                  paper: classes.drawerPaper
                }}
              >
                {drawer}
              </Drawer>
            </Hidden>
            <Grid container direction={"column"} className={classes.content} justify={"flex-start"} alignItems={"stretch"}>
              <Grid item xs={12}>
                <div className={classes.toolbar} />
                <SubComponent router={{ ...this.props.router }} />
              </Grid>
              <Hidden only={['xs', 'sm']}>
                <BenderBottom />
              </Hidden>
            </Grid>
          </div>
        );
      }
    }));

Dashboard.propTypes = {
  classes: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired
};

export default withStyles(styles, { withTheme: true })(Dashboard);
