/**
 * Menus.js
 * Menus list component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import moment from "moment";
import { extendObservable, action } from "mobx";
import { observer, inject } from "mobx-react";
import { withStyles } from "@material-ui/core/styles";
import Table from "./GenericTable"
import FloatingAddButton from "./buttons/FloatingAddButton"
import ActionsButtons from "./buttons/ActionsButtons"
import Grid from "@material-ui/core/Grid";
import EnabledIcon from "@material-ui/icons/Done"
import DisabledIcon from "@material-ui/icons/Clear"
import Dialog from '@material-ui/core/Dialog';
import MenuPreview from './MenuPreview';

const styles = theme => ({
    enabled: {
        color: "green"
    },
    disabled: {
        color: "red"
    }
});

const Menus = inject("ctx")(
    observer(
        class extends React.Component {
            constructor(props) {
                super(props);
                props.ctx.menus.fetch();
                extendObservable(this, {
                    selectedMenu: null,
                    menuPreviewOpen: false
                });
            }

            handleDelete = id => () => {
                this.props.ctx.dialog.set({
                    open: true,
                    showCancel: true,
                    onClose: (response) => {
                        if (response) {
                            this.props.ctx.menus.delete(id, () => {
                                this.props.ctx.menus.fetch();
                            });
                        }
                    },
                    title: "Delete",
                    description: "Are you sure to delete the daily menu?"
                })
            }

            render() {

                const options = {
                    defaultSorted: [
                        {
                            id: "day",
                            desc: true
                        }
                    ]
                };

                const actions = (props) => {
                    const cannotEdit = roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.user) ||
                                        (!roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root) && (moment(props.original.day).isBefore(moment(), 'day') || moment().isAfter(moment(props.original.deadline).add(2, 'h')))),
                        canDelete = roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root) || 
                                    (roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.admin) && props.original.enabled === false);
                    return (
                        <ActionsButtons
                            view={action(() => { this.selectedMenu = props.original; this.menuPreviewOpen = true; })}
                            edit={cannotEdit ? undefined : () => { this.props.ctx.history.push('/menus/' + props.original._id) }}
                            delete={canDelete ? this.handleDelete(props.original._id) : undefined}
                        />
                    )
                };

                const { classes } = this.props,
                    roles = this.props.ctx.roles,
                    columns = [{
                        Header: 'Day',
                        accessor: 'day',
                        Cell: props => moment(props.value).format('DD/MM/YY')
                    }, {
                        Header: 'Enabled',
                        accessor: 'enabled',
                        filterable: false,
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.admin),
                        Cell: props => { return props.value ? <EnabledIcon className={props.value ? classes.enabled : classes.disabled} /> : <DisabledIcon className={props.value ? classes.enabled : classes.disabled} /> }
                    }, {
                        Header: 'Deleted',
                        accessor: 'deleted',
                        filterable: false,
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root),
                        Cell: props => { return props.value ? <EnabledIcon className={!props.value ? classes.enabled : classes.disabled} /> : <DisabledIcon className={!props.value ? classes.enabled : classes.disabled} /> }
                    }, {
                        Header: 'Label',
                        accessor: 'label',
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.user),
                    }, {
                        id: 'ownerUsername',
                        Header: 'Owner',
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.admin),
                        accessor: d => { return d.owner ? d.owner.username : '-' }
                    }, {
                        Header: 'Created',
                        accessor: 'createdAt',
                        filterable: false,
                        Cell: props => { return <span title={moment(props.value).format('DD/MM/YY HH:mm:ss')}>{moment(props.value).from(moment())}</span> }
                    }, {
                        Header: 'Updated',
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
                                title="Menus"
                                filters={true}
                                errorDataText={"Error"}
                                emptyDataText={"Menus not available"}
                                options={options}
                                firstTimeLoading={this.props.ctx.menus.menus == null}
                                columns={columns}
                                data={this.props.ctx.menus.menus}
                                store={this.props.ctx.menus}
                                showPagination={true}
                            />
                            {roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.admin) && <FloatingAddButton
                                onClick={() => this.props.ctx.history.push('/menus/new')}
                            />}
                            <Dialog onClose={action(() => { this.menuPreviewOpen = false; })} open={this.menuPreviewOpen}>
                                <MenuPreview menu={this.selectedMenu}/>
                            </Dialog>
                        </Grid>
                    </Grid>
                );
            }
        }));

export default withStyles(styles)(Menus);