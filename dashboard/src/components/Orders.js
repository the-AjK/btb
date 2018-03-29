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

const styles = theme => ({

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
                        id: 'ownerUsername',
                        Header: 'Owner',
                        accessor: d => { return d.owner ? d.owner.username : '-' }
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
                            <h2>Daily orders stats:</h2>
                            <p>{JSON.stringify(this.props.ctx.stats.ordersStats.stats, null, 2)}</p>
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
                            />
                        </Grid>
                    </Grid>
                );
            }
        }));

export default withStyles(styles)(Orders);