/**
 * Table.js
 * Wrapper for React-Table
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import ReactTable from 'react-table'
import checkboxHOC from 'react-table/lib/hoc/selectTable';
import React from 'react';
import { extendObservable, action } from "mobx";
import { observer, inject } from "mobx-react";
import { withStyles } from "material-ui/styles";
import Fade from "material-ui/transitions/Fade";
import { CircularProgress } from 'material-ui/Progress';
import WarningIcon from 'material-ui-icons/Warning';
import FilterList from 'material-ui-icons/FilterList';
import FullList from 'material-ui-icons/FormatAlignJustify';
import SyncIcon from 'material-ui-icons/Sync';
import Grid from "material-ui/Grid";

import 'react-table/react-table.css'

const CheckboxTable = checkboxHOC(ReactTable);
const styles = theme => ({
    refresh: {
        float: 'right',
        marginTop: '1em',
        position: 'relative',
        cursor: 'pointer'
    },
    filters: {
        cursor: 'pointer',
        marginBottom: "-0.2em",
        marginLeft: "0.5em"
    },
    loadingMessage: {
        textAlign: "center"
    },
    title: {
        float: "left"
    },
    titleBar: {
        width: "100%"
    }
});

const Table = inject("ctx")(
    observer(
        class extends React.Component {

            constructor() {
                super();
                extendObservable(this, { filters_enabled: false });
            }

            handleEnableFilters = action(() => {
                this.filters_enabled = !this.filters_enabled;
            });

            fetchData = (state, instance) => {
                if (this.props.store.setPagination)
                    this.props.store.setPagination({
                        pageSize: state.pageSize,
                        page: state.page,
                        sorted: state.sorted,
                        filtered: state.filtered
                    });
                this.props.store.fetch();
            };

            render() {

                const { classes } = this.props;

                const checkboxProps = {
                    selectAll: false,
                    selectType: 'checkbox',
                };

                let options = {
                    className: this.props.highlightRows === false ? undefined : "-highlight",
                    loading: false,
                    noDataText: this.props.store.isLoading ? "Loading" : (this.props.store.error ? this.props.errorDataText : this.props.emptyDataText),
                    style: {
                        //maxHeight: "400px"
                    },
                    minRows: 1,
                    defaultFilterMethod: (filter, row, column) => {
                        const id = filter.pivotId || filter.id,
                            filterValue = filter.value.trim().toLowerCase(),
                            cellValue = row[id] !== undefined ? String(row[id]).toLowerCase() : "";

                        if (cellValue === "" && filterValue !== "")
                            return false;

                        return cellValue.indexOf(filterValue) > -1;
                    },
                }
                Object.assign(options, this.props.options)

                //Fix "Headers sometimes get misaligned"
                // with the assumption that maxHeight: "400px" allow to show 7 rows without scrolling
                //https://github.com/react-tools/react-table/wiki/FAQ
                const fixAligment = (state, rowInfo, column) => {
                    return {
                        style: {
                            overflowY: this.props.data.length > 7 ? 'scroll' : 'none'
                        }
                    }
                }

                const trProps = (state, rowInfo, column) => {
                    return {
                        style: {
                            alignItems: "center"
                        }
                    }
                }

                const tdProps = (state, rowInfo, column) => {
                    return {
                        style: {
                            textAlign: "center",
                            paddingTop: "1em"
                        }
                    }
                }

                return (
                    <Grid container direction={"column"} justify={"flex-start"} alignItems={"flex-start"}>
                        <Grid item className={classes.titleBar}>
                            {this.props.title !== false && <h3 className={classes.title}>
                                {this.props.title ? this.props.title : ""}
                                {(this.props.filters && !this.props.firstTimeLoading && this.props.data.length > 0) &&
                                    <span onClick={() => { this.handleEnableFilters() }} data-toggle="tooltip" title={this.filters_enabled ? "Disable filters" : "Enable filters"} style={{ cursor: "pointer" }}>
                                        {this.filters_enabled ?
                                            <FullList className={classes.filters} /> : <FilterList className={classes.filters} />
                                        }
                                    </span>
                                }
                                {(this.props.store.error && !this.props.store.isLoading) && <span data-toggle="tooltip" title={this.props.errorDataText} style={{ cursor: "pointer" }}><WarningIcon style={{ marginBottom: "-0.2em" }} /></span>}
                            </h3>}
                            {!this.props.firstTimeLoading && <span className={classes.refresh} data-toggle="tooltip" title={"Refresh"}>
                                {!this.props.store.isLoading && <SyncIcon onClick={() => { this.props.store.fetch() }} />}
                            </span>}
                        </Grid>
                        {(this.props.store.isLoading && this.props.firstTimeLoading) ?
                            <Grid container direction={"row"} justify={"center"} alignItems={"center"}>
                                <Grid item xs={12} className={classes.loadingMessage}>
                                    <CircularProgress />
                                    <h4>Loading data... please wait</h4>
                                </Grid>
                            </Grid> :
                            <Fade in={true} timeout={500}>
                                <Grid container direction={"row"} justify={"flex-start"} alignItems={"flex-start"}>
                                    <Grid item xs={12}>
                                        {!this.props.checkbox && <ReactTable
                                            {...options}
                                            manual={this.props.serverSidePagination}
                                            pages={this.props.serverSidePagination ? this.props.store.pages : undefined}
                                            loading={this.props.store.isLoading}
                                            onFetchData={this.props.serverSidePagination ? this.fetchData : undefined}
                                            getTdProps={tdProps}
                                            getTrProps={trProps}
                                            getTheadProps={fixAligment}
                                            getTheadGroupProps={fixAligment}
                                            filterable={this.filters_enabled}
                                            data={this.props.data}
                                            columns={this.props.columns}
                                            showPagination={this.props.showPagination || false}
                                            showPaginationBottom={true}
                                            showPageSizeOptions={true}
                                            pageSizeOptions={[5, 10, 20, 50, 100]}
                                            defaultPageSize={5}
                                        />}
                                        {this.props.checkbox && <CheckboxTable
                                            {...options}
                                            {...checkboxProps}
                                            getTdProps={tdProps}
                                            getTrProps={trProps}
                                            getTheadProps={fixAligment}
                                            getTheadGroupProps={fixAligment}
                                            filterable={this.filters_enabled}
                                            data={this.props.data}
                                            columns={this.props.columns}
                                        />}
                                    </Grid>
                                </Grid>
                            </Fade>
                        }
                    </Grid>
                )
            }
        }));

export default withStyles(styles)(Table);

/*exports.statusFormatter = ({row, value}) => {
	return (value.indexOf('down') < 0) ? (value.indexOf('inactive') < 0 ? <OKIcon color={green[500]}/> : <NOKIcon color={orange[500]}/>) : <NOKIcon color={red[500]}/>
}*/