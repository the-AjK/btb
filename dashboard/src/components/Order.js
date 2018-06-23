/**
 * Order.js
 * Order component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer, inject } from "mobx-react";
import { extendObservable, action } from "mobx";
import { withStyles } from "material-ui/styles";
import Grid from "material-ui/Grid";
import TextField from 'material-ui/TextField';
import { FormGroup, FormControl, FormLabel, FormHelperText, FormControlLabel } from 'material-ui/Form';
import FloatingSaveButton from "./buttons/FloatingSaveButton";

import moment from 'moment';

const styles = theme => ({
    root: {
        display: 'flex'
    },
    container: {
        //height: "100em"
    }
});

const Order = inject("ctx")(
    observer(
        class extends React.Component {
            constructor(props) {
                super(props);
                extendObservable(this, {
                    id: props.router.computedMatch.params.id,
                    isSaving: false,
                    availableTables: [],
                    order: {}
                });
                if (this.id && this.id !== "new") {
                    props.ctx.orders.get(this.id, action((err, order) => {
                        if (err) {
                            alert(err)
                        } else {
                            this.props.ctx.tables.fetch(action((err, tables) => {
                                if (err) {
                                    console.error(err);
                                } else if (tables) {
                                    this.availableTables = tables.map(t => {
                                        t.enabled = this.menu.tables.map(mt => mt._id).indexOf(t._id) >= 0;
                                        return t;
                                    });
                                }
                            }));
                        }
                    }));
                } else {
                    this.props.ctx.tables.fetch(action((err, tables) => {
                        if (err) {
                            console.error(err);
                        } else if (tables) {
                            this.availableTables = tables;
                        }
                    }));
                }
            }

            orderIsValid = (cb) => {
                
                cb();
            }

            handleSave = () => {
                let message = "Are you sure to save the changes?",
                    warnings = "";
                /*if (this.menu.secondCourse.items.length === 0) {
                    warnings += "\n - Second courses list is empty!";
                }*/
                if (warnings !== "") {
                    message += "\n\nWarnings:\n" + warnings;
                }
                this.orderIsValid((err) => {
                    if (err) {
                        this.showAlert("Error", err);
                    } else {
                        this.props.ctx.dialog.set({
                            open: true,
                            showCancel: true,
                            onClose: (response) => {
                                if (response) {
                                    this.save()
                                }
                            },
                            title: "Save",
                            description: message
                        });
                    }
                });
            }

            showAlert = (title, description) => {
                this.props.ctx.dialog.set({
                    open: true,
                    onClose: (response) => {

                    },
                    showCancel: false,
                    title: title,
                    description: description
                })
            }

            save = action(() => {
                this.isSaving = true;
                if (this.id && this.id !== "new") {
                    //Update
                    this.props.ctx.orders.update(this.id, this.order, action((err, res) => {
                        if (err) {
                            this.showAlert("Error", err);
                        } else {
                            this.showAlert("Success", "Order updated!");
                        }
                        this.isSaving = false;
                    }));
                } else {
                    this.props.ctx.orders.add(this.order, action((err, res) => {
                        if (err) {
                            this.showAlert("Error", err);
                        } else if (res) {
                            this.props.ctx.history.push("/orders/" + res._id)
                            this.id = res._id;
                            this.showAlert("Success", "Order created!");
                        }
                        this.isSaving = false;
                    }));
                }
            })

            render() {
                const { classes } = this.props;
                return (

                    <Grid
                        className={classes.root}
                        container
                        direction={"row"}
                        justify={"center"}
                        alignItems={"stretch"}
                    >
                        <Grid item xs={12} md={8}>
                            <Grid
                                className={classes.root}
                                container
                                direction={"row"}
                                alignItems={"stretch"}
                            >
                                <Grid item xs={12}>
                                    {this.id !== "new" && <h2>Edit Order</h2>}
                                    {this.id === "new" && <h2>Add Order</h2>}
                                </Grid>
                                {this.props.ctx.orders.isLoading &&
                                    <Grid item xs={12} className={classes.container}>
                                        <h3>Loading... please wait</h3>
                                    </Grid>}
                                {!this.props.ctx.orders.isLoading &&
                                    <Grid item xs={12} className={classes.container}>
                                        <FloatingSaveButton disabled={this.isSaving} onClick={this.handleSave} />
                                        <Grid
                                            container
                                            direction={"column"}
                                            justify={"center"}
                                            alignItems={"stretch"}
                                            spacing={16}
                                        >
                                            <Grid item xs={12}>
                                                
                                            </Grid>
                                            <Grid item xs={12}>
                                                
                                            </Grid>                                           
                                        </Grid>
                                    </Grid>}
                            </Grid>
                        </Grid>
                    </Grid>
                );
            }
        }));

export default withStyles(styles)(Order);