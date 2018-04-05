/**
 * Menus.js
 * Menus list component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import moment from "moment";
import { observer, inject } from "mobx-react";
import { withStyles } from "material-ui/styles";
import Table from "./GenericTable"
import FloatingAddButton from "./buttons/FloatingAddButton"
import ActionsButtons from "./buttons/ActionsButtons"
import Grid from "material-ui/Grid";
import EnabledIcon from "material-ui-icons/Done"
import DisabledIcon from "material-ui-icons/Clear"

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
                            id: "updatedAt",
                            desc: true
                        }
                    ]
                };

                const actions = (props) => {
                    return (
                        <ActionsButtons
                            edit={() => { this.props.ctx.history.push('/menus/' + props.original._id) }}
                            delete={this.handleDelete(props.original._id)}
                        />
                    )
                };

                const { classes, theme } = this.props,
                    roles = this.props.ctx.roles,
                    columns = [{
                        Header: 'Day',
                        accessor: 'day',
                        Cell: props => moment(props.value).format('DD/MM/YY')
                    }, {
                        Header: 'Enabled',
                        accessor: 'enabled',
                        filterable: false,
                        Cell: props => { return props.value ? <EnabledIcon className={props.value ? classes.enabled : classes.disabled}/> : <DisabledIcon className={props.value ? classes.enabled : classes.disabled}/> }
                    }, {
                        Header: 'Deleted',
                        accessor: 'deleted',
                        filterable: false,
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root),
                        Cell: props => { return props.value ? <EnabledIcon className={!props.value ? classes.enabled : classes.disabled}/> : <DisabledIcon className={!props.value ? classes.enabled : classes.disabled}/> }
                    }, {
                        Header: 'Label',
                        accessor: 'label'
                    }, {
                        id: 'ownerUsername',
                        Header: 'Owner',
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
                            />
                            <FloatingAddButton
                                onClick={() => this.props.ctx.history.push('/menus/new')}
                            />
                        </Grid>
                    </Grid>
                );
            }
        }));

export default withStyles(styles)(Menus);