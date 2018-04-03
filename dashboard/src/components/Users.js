/**
 * Users.js
 * Users list component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import moment from "moment";
import { observer, inject } from "mobx-react";
import { withStyles } from "material-ui/styles";
import Table from "./GenericTable"
import Grid from "material-ui/Grid";
import ActionsButtons from "./buttons/ActionsButtons"
import Button from "material-ui/Button";

const styles = theme => ({

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

            handleBanned = props => () => {
                this.props.ctx.dialog.set({
                    open: true,
                    showCancel: true,
                    onClose: (response) => {
                        if (response) {
                            let userID = props.original._id,
                                data = { banned: true, sendNotification: true };
                            if (props.original.banned) {
                                data.banned = false;
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
                    return (
                        <ActionsButtons
                            //edit={() => { this.props.ctx.history.push('/users/' + props.original._id) }}
                            delete={this.handleDelete(props.original)}
                        />
                    )
                };

                const { classes, theme } = this.props,
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
                        Cell: props => <Button onClick={this.handleTelegram(props)}>{props.value ? "Enabled" : "Disabled"}</Button>
                    }, {
                        Header: 'Dashboard Enabled',
                        accessor: 'enabled',
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root),
                        Cell: props => <Button onClick={this.handleDashboard(props)}>{props.value ? "Enabled" : "Disabled"}</Button>
                    }, {
                        id: 'telegramBanned',
                        Header: 'Banned',
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root),
                        accessor: d => d.telegram.banned,
                        Cell: props => <Button onClick={this.handleBanned(props)}>{props.value ? "Banned" : "Unbanned"}</Button>
                    }, {
                        Header: 'Deleted',
                        accessor: 'deleted',
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root),
                        Cell: props => <span className='enabled'>{props.value ? "OK" : "-"}</span>
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
                        accessor: d => d.role.title
                    }, {
                        id: 'telegramID',
                        Header: 'Telegram ID',
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root),
                        accessor: d => d.telegram.id
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
                        id: 'pintBeers',
                        Header: 'Pints',
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root),
                        accessor: d => d.beerCounter.pint
                    }, {
                        id: 'halfPintBeers',
                        Header: 'HalfPints',
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root),
                        accessor: d => d.beerCounter.halfPint
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
                            />
                        </Grid>
                    </Grid>
                );
            }
        }));

export default withStyles(styles)(Users);