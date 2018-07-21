/**
 * Users.js
 * Users list component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import moment from "moment";
import { observer, inject } from "mobx-react";
import { withStyles } from "@material-ui/core/styles";
import Table from "./GenericTable"
import Grid from "@material-ui/core/Grid";
import ActionsButtons from "./buttons/ActionsButtons"
import Button from "@material-ui/core/Button";
import Autorenew from '@material-ui/icons/Autorenew';


const styles = theme => ({
    enabled: {
        color: "green"
    },
    disabled: {
        color: "red"
    },
    rootRole: {
        color: "black"
    },
    adminRole: {
        color: "orange"
    },
    userRole: {
        color: "blue"
    }
});

const Users = inject("ctx")(
    observer(
        class extends React.Component {
            constructor(props) {
                super(props);
                props.ctx.users.fetch();
            }

            handleDelete = user => () => {
                this.props.ctx.dialog.set({
                    open: true,
                    showCancel: true,
                    onClose: (response) => {
                        if (response) {
                            this.props.ctx.users.delete(user._id, () => {
                                this.props.ctx.users.fetch();
                            });
                        }
                    },
                    title: "Delete " + user.email,
                    description: "Are you sure to delete the user?"
                })
            }

            handleTelegram = props => () => {
                this.props.ctx.dialog.set({
                    open: true,
                    showCancel: true,
                    onClose: (response) => {
                        if (response) {
                            let userID = props.original._id,
                                data = { telegram: { enabled: true }, sendNotification: true };
                            if (props.original.telegram.enabled) {
                                data.telegram.enabled = false;
                            }
                            this.props.ctx.users.update(userID, data, (err) => {
                                if (!err) {
                                    this.props.ctx.users.fetch();
                                }
                            });
                        }
                    },
                    title: "Telegram " + (props.original.telegram.enabled ? "disable " : "enable ") + props.original.email,
                    description: "Are you sure to " + (props.original.telegram.enabled ? "disable" : "enable") + " the user?"
                })
            }

            handleDashboard = props => () => {
                this.props.ctx.dialog.set({
                    open: true,
                    showCancel: true,
                    onClose: (response) => {
                        if (response) {
                            let userID = props.original._id,
                                data = { enabled: true, sendNotification: true };
                            if (props.original.enabled) {
                                data.enabled = false;
                            }
                            this.props.ctx.users.update(userID, data, (err) => {
                                if (!err) {
                                    this.props.ctx.users.fetch();
                                }
                            });
                        }
                    },
                    title: "Dashboard " + (props.original.enabled ? "disable " : "enable ") + props.original.email,
                    description: "Are you sure to " + (props.original.enabled ? "disable" : "enable") + " the user?"
                })
            }

            showAlert = (title, description, onClose) => {
                this.props.ctx.dialog.set({
                    open: true,
                    onClose: (response) => {
                        if (onClose)
                            onClose(response);
                    },
                    showCancel: false,
                    title: title,
                    description: description
                })
            }

            handlePasswordReset = props => () => {
                this.props.ctx.dialog.set({
                    open: true,
                    showCancel: true,
                    onClose: (response) => {
                        if (response) {
                            let userID = props.original._id,
                                data = { password: props.original.telegram.id.toString() }
                            this.props.ctx.users.update(userID, data, (err) => {
                                if (err) {
                                    this.showAlert("Error", err);
                                } else {
                                    this.showAlert("Success", "Password successfully reset");
                                    this.props.ctx.users.fetch();
                                }
                            });
                        }
                    },
                    title: "Password reset",
                    description: "Are you sure to reset password for the user: " + props.original.email + "?"
                });
            }

            handleBanned = props => () => {
                this.props.ctx.dialog.set({
                    open: true,
                    showCancel: true,
                    onClose: (response) => {
                        if (response) {
                            let userID = props.original._id,
                                data = { telegram: { banned: true }, sendNotification: true };
                            if (props.original.telegram.banned) {
                                data.telegram.banned = false;
                            }
                            this.props.ctx.users.update(userID, data, (err) => {
                                if (!err) {
                                    this.props.ctx.users.fetch();
                                }
                            });
                        }
                    },
                    title: (props.original.banned ? "Unban " : "Ban ") + props.original.email,
                    description: "Are you sure to " + (props.original.banned ? "unban" : "ban") + " the user?"
                })
            }

            handleRole = props => () => {
                let role = prompt("Enter user role:", props.original.role.title);
                if (role && role !== "" && role !== props.original.role.title) {
                    let id = props.original._id,
                        data = { role: role };
                    this.props.ctx.users.update(id, data, (err) => {
                        if (err) {
                            this.showAlert("Error", err);
                        } else {
                            this.showAlert("Success", "Role successfully set");
                            this.props.ctx.users.fetch();
                        }
                    });
                }
            }

            render() {

                const options = {
                    defaultSorted: [
                        {
                            id: "updatedAt",
                            desc: true
                        }
                    ]
                };

                const actions = (props) => {
                    if (props.original.email !== this.props.ctx.auth.user.email) {
                        let roles = this.props.ctx.roles,
                            userCannotBeDeleted = (!roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root) && roles.checkUser(props.original.role, roles.userRoles.root)) ||
                                (this.props.ctx.auth.user.email === props.original.email) || (roles.checkUser(this.props.ctx.auth.user.role, roles.userRoles.admin) && roles.checkUser(props.original.role, roles.userRoles.admin));
                        return (
                            <ActionsButtons
                                //edit={() => { this.props.ctx.history.push('/users/' + props.original._id) }}
                                delete={!userCannotBeDeleted ? this.handleDelete(props.original) : undefined}
                            />
                        )
                    } else {
                        return
                    }
                };

                const { classes } = this.props,
                    roles = this.props.ctx.roles,
                    columns = [{
                        Header: 'Username',
                        accessor: 'username'
                    }, {
                        Header: 'Email',
                        accessor: 'email'
                    }, {
                        id: 'telegramEnabled',
                        Header: 'Enabled',
                        filterable: false,
                        accessor: d => d.telegram.enabled,
                        Cell: props => {
                            const userCannotBeEdit = (!roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root) && roles.checkUser(props.original.role, roles.userRoles.root)) ||
                                (this.props.ctx.auth.user.email === props.original.email) || (roles.checkUser(this.props.ctx.auth.user.role, roles.userRoles.admin) && roles.checkUser(props.original.role, roles.userRoles.admin));

                            return (<Button disabled={userCannotBeEdit} className={props.value ? classes.enabled : classes.disabled} onClick={this.handleTelegram(props)}>{props.value ? "Enabled" : "Disabled"}</Button>)
                        }
                    }, {
                        Header: 'Dashboard Enabled',
                        accessor: 'enabled',
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.admin),
                        Cell: props => {
                            const userCannotBeEdit = (!roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root) && roles.checkUser(props.original.role, roles.userRoles.root)) ||
                                (this.props.ctx.auth.user.email === props.original.email) || (roles.checkUser(this.props.ctx.auth.user.role, roles.userRoles.admin) && roles.checkUser(props.original.role, roles.userRoles.admin));

                            return (<Button disabled={userCannotBeEdit} className={props.value ? classes.enabled : classes.disabled} onClick={this.handleDashboard(props)}>{props.value ? "Enabled" : "Disabled"}</Button>)
                        }
                    }, {
                        Header: 'Password reset',
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root),
                        Cell: props => <Autorenew onClick={this.handlePasswordReset(props)} />
                    }, {
                        id: 'telegramBanned',
                        Header: 'Banned',
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root),
                        accessor: d => d.telegram.banned,
                        Cell: props => <Button className={!props.value ? classes.enabled : classes.disabled} onClick={this.handleBanned(props)}>{props.value ? "Banned" : "Unbanned"}</Button>
                    }, {
                        Header: 'Deleted',
                        accessor: 'deleted',
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root),
                        Cell: props => <span className='enabled'>{props.value ? "OK" : "-"}</span>
                    }, {
                        Header: 'Points',
                        //show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root),
                        accessor: 'points'
                    }, {
                        id: 'orderReminder',
                        Header: 'OrderReminder',
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root),
                        accessor: d => d.settings.orderReminder,
                        Cell: props => <span className='enabled'>{props.value ? "OK" : "-"}</span>
                    }, {
                        id: 'dailyMenu',
                        Header: 'DailyMenu',
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root),
                        accessor: d => d.settings.dailyMenu,
                        Cell: props => <span className='enabled'>{props.value ? "OK" : "-"}</span>
                    }, {
                        id: 'roleTitle',
                        Header: 'Role',
                        filterable: false,
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root),
                        accessor: d => d.role.title,
                        Cell: props => <Button className={classes[props.value + "Role"]} onClick={this.handleRole(props)}>{props.value}</Button>
                    }, {
                        id: 'telegramID',
                        Header: 'Telegram ID',
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root),
                        accessor: d => d.telegram.id,
                        Cell: props => <a href={"tg://user?id=" + props.value}>{props.value}</a>
                    }, {
                        Header: 'Last login',
                        accessor: 'lastLogin',
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root),
                        Cell: props => { return props.value ? moment(props.value).format('DD/MM/YY HH:mm:ss') : "-" }
                    }, {
                        Header: 'Logins',
                        accessor: 'loginCounter',
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root)
                    }, {
                        Header: 'Created at',
                        accessor: 'createdAt',
                        filterable: false,
                        Cell: props => { return <span title={moment(props.value).format('DD/MM/YY HH:mm:ss')}>{moment(props.value).from(moment())}</span> }
                    }, {
                        Header: 'Updated at',
                        accessor: 'updatedAt',
                        filterable: false,
                        Cell: props => { return <span title={moment(props.value).format('DD/MM/YY HH:mm:ss')}>{moment(props.value).from(moment())}</span> }
                    }, {
                        Header: 'Actions',
                        sortable: false,
                        filterable: false,
                        Cell: actions
                    }]
                return (
                    <Grid container direction={"column"} justify={"flex-start"} alignItems={"stretch"}>
                        <Grid item xs={12}>
                            <Table
                                title="Users"
                                filters={true}
                                errorDataText={"Error"}
                                emptyDataText={"Users not available"}
                                options={options}
                                firstTimeLoading={this.props.ctx.users.users == null}
                                columns={columns}
                                data={this.props.ctx.users.users}
                                store={this.props.ctx.users}
                                showPagination={true}
                            />
                        </Grid>
                    </Grid>
                );
            }
        }));

export default withStyles(styles)(Users);