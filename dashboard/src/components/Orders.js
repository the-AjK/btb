/**
 * Orders.js
 * Orders list component
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

const Orders = inject("ctx")(
    observer(
        class extends React.Component {
            constructor(props) {
                super(props);
                this.props.ctx.orders.fetch();
                this.props.ctx.stats.fetch();
            }

            handleDelete = order => () => {
                this.props.ctx.dialog.set({
                    open: true,
                    showCancel: true,
                    onClose: (response) => {
                        if (response) {
                            this.props.ctx.orders.delete(order._id, () => {
                                this.props.ctx.orders.fetch();
                            });
                        }
                    },
                    title: "Delete",
                    description: "Are you sure to delete the order?"
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
                            //edit={() => { this.props.ctx.history.push('/orders/' + props.original._id) }}
                            delete={this.handleDelete(props.original)}
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
                        id: 'ownerEmail',
                        Header: 'Owner',
                        accessor: d => { return d.owner ? d.owner.email : '-' }
                    }, {
                        id: 'firstCourse',
                        Header: 'First course',
                        accessor: d => { return d.firstCourse ? d.firstCourse.item : '-' }
                    }, {
                        id: 'secondCourse',
                        Header: 'Second course',
                        accessor: d => { return d.secondCourse ? d.secondCourse.item : '-' }
                    }, {
                        id: 'tableName',
                        Header: 'Table',
                        accessor: d => { return d.table ? d.table.name : '-' }
                    }, {
                        Header: 'Deleted',
                        accessor: 'deleted',
                        filterable: false,
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root),
                        Cell: props => { return props.value ? <EnabledIcon className={!props.value ? classes.enabled : classes.disabled} /> : <DisabledIcon className={!props.value ? classes.enabled : classes.disabled} /> }
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
                    }],
                    dailyOrderColumns = [{
                        accessor: 'table',
                        Header: 'Table'
                    }, {
                        accessor: 'item',
                        Header: 'Items',
                    }, {
                        id: 'ownerEmail',
                        Header: 'Owner',
                        Aggregated: row => {
                            return "-";
                        },
                        accessor: d => { return d.owner ? d.owner.email : '-' }
                    }];

                const dailyOrders = [];

                if (this.props.ctx.stats.ordersStats) {
                    for (let tableName in this.props.ctx.stats.ordersStats.stats) {
                        const table = this.props.ctx.stats.ordersStats.stats[tableName];
                        if (table.firstCourses) {
                            for (let key in table.firstCourses) {
                                const fc = table.firstCourses[key];
                                for (let i = 0; i < fc.length; i++) {
                                    dailyOrders.push({
                                        table: tableName,
                                        owner: fc[i].owner,
                                        item: fc[i].item + (fc[i].condiment ? (" - " + fc[i].condiment) : "")
                                    })
                                }
                            }
                        }
                        if (table.secondCourses) {
                            for (let key in table.secondCourses) {
                                const sc = table.secondCourses[key];
                                for (let i = 0; i < sc.length; i++) {
                                    let obj = {
                                        table: tableName,
                                        owner: sc[i].owner,
                                        item: sc[i].item
                                    };
                                    for (let j = 0; j < sc[i].sideDishes.length; j++) {
                                        obj.item = obj.item + " - " + sc[i].sideDishes[j]
                                    }
                                    dailyOrders.push(obj);
                                }
                            }
                        }
                    }
                }

                return (
                    <Grid container direction={"column"} justify={"flex-start"} alignItems={"stretch"}>
                        <Grid item xs={12}>
                            <Table
                                title="Daily orders"
                                filters={true}
                                errorDataText={"Error"}
                                emptyDataText={"Daily Order not available"}
                                options={{ pivotBy: ['table'] }}
                                firstTimeLoading={this.props.ctx.stats.ordersStats && this.props.ctx.stats.ordersStats.stats == null}
                                columns={dailyOrderColumns}
                                data={dailyOrders}
                                store={this.props.ctx.stats}
                                showPagination={false}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Table
                                title="Orders"
                                filters={true}
                                errorDataText={"Error"}
                                emptyDataText={"Orders not available"}
                                options={options}
                                firstTimeLoading={this.props.ctx.orders.orders == null}
                                columns={columns}
                                data={this.props.ctx.orders.orders}
                                store={this.props.ctx.orders}
                                showPagination={true}
                            />
                        </Grid>
                    </Grid>
                );
            }
        }));

export default withStyles(styles)(Orders);