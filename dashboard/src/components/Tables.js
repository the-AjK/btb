/**
 * Tables.js
 * Tables list component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import moment from "moment";
import { observer, inject } from "mobx-react";
import { withStyles } from "@material-ui/core/styles";
import Table from "./GenericTable"
import FloatingAddButton from "./buttons/FloatingAddButton"
import Grid from "@material-ui/core/Grid";
import ActionsButtons from "./buttons/ActionsButtons"
import Button from "@material-ui/core/Button";

const styles = theme => ({
    enabled: {
        color: "green"
    },
    disabled: {
        color: "red"
    }
});

const Tables = inject("ctx")(
    observer(
        class extends React.Component {
            constructor(props) {
                super(props);
                props.ctx.tables.fetch();
            }

            handleAddTable = () => {
                const table = { name: "Table" + this.props.ctx.tables.tables.length, seats: 2 };
                this.props.ctx.tables.add(table, () => {
                    this.props.ctx.tables.fetch();
                });
            }

            handleEnabled = props => () => {
                this.props.ctx.dialog.set({
                    open: true,
                    showCancel: true,
                    onClose: (response) => {
                        if (response) {
                            let id = props.original._id,
                                data = { enabled: true };
                            if (props.original.enabled) {
                                data.enabled = false;
                            }
                            this.props.ctx.tables.update(id, data, (err) => {
                                if (!err) {
                                    this.props.ctx.tables.fetch();
                                }
                            });
                        }
                    },
                    title: (props.original.enabled ? "Disable " : "Enable ") + props.original.name,
                    description: "Are you sure to " + (props.original.enabled ? "disable" : "enable") + " the table?"
                });
            }

            handleDelete = props => () => {
                this.props.ctx.dialog.set({
                    open: true,
                    showCancel: true,
                    onClose: (response) => {
                        if (response) {
                            this.props.ctx.tables.delete(props._id, () => {
                                this.props.ctx.tables.fetch();
                            });
                        }
                    },
                    title: "Delete " + props.name,
                    description: "Are you sure to delete the table?"
                })
            }

            handleName = props => () => {
                let name = prompt("Enter table name:", props.original.name);
                if(name !== "" && name !== props.original.name){
                    let id = props.original._id,
                        data = { name: name };
                    this.props.ctx.tables.update(id, data, (err) => {
                        if (!err) {
                            this.props.ctx.tables.fetch();
                        }
                    });
                }
            }

            handleSeats = props => () => {
                let seats = parseInt(prompt("Enter table seats:", props.original.seats), 10);
                if(!isNaN(seats) && seats !== 0){
                    let id = props.original._id,
                        data = { seats: seats };
                    this.props.ctx.tables.update(id, data, (err) => {
                        if (!err) {
                            this.props.ctx.tables.fetch();
                        }
                    });
                }
            }

            render() {

                const options = {
                    defaultSorted: [
                        {
                            id: "name",
                            desc: false
                        }
                    ]
                };

                const actions = (props) => {
                    return (
                        <ActionsButtons
                            delete={this.handleDelete(props.original)}
                        />
                    )
                };

                const { classes } = this.props,
                    roles = this.props.ctx.roles,
                    columns = [{
                        Header: 'Enabled',
                        accessor: 'enabled',
                        filterable: false,
                        Cell: props => <Button className={props.value ? classes.enabled : classes.disabled} onClick={this.handleEnabled(props)}>{props.value ? "Enabled" : "Disabled"}</Button>
                    }, {
                        Header: 'Name',
                        accessor: 'name',
                        Cell: props => <Button onClick={this.handleName(props)}>{props.value}</Button>
                    }, {
                        Header: 'Seats',
                        accessor: 'seats',
                        Cell: props => <Button onClick={this.handleSeats(props)}>{props.value}</Button>
                    }, {
                        Header: 'Deleted',
                        accessor: 'deleted',
                        filterable: false,
                        show: roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root),
                        Cell: props => <span className='enabled'>{props.value ? "OK" : "-"}</span>
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
                                title="Tables"
                                filters={true}
                                errorDataText={"Error"}
                                emptyDataText={"Tables not available"}
                                options={options}
                                firstTimeLoading={this.props.ctx.tables.tables == null}
                                columns={columns}
                                data={this.props.ctx.tables.tables}
                                store={this.props.ctx.tables}
                                showPagination={true}
                            />
                            <FloatingAddButton
                                onClick={this.handleAddTable}
                            />
                        </Grid>
                    </Grid>
                );
            }
        }));

export default withStyles(styles)(Tables);