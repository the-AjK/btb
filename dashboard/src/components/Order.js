/**
 * Order.js
 * Order component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer, inject } from "mobx-react";
import { extendObservable, action } from "mobx";
import { withStyles } from "@material-ui/core/styles";
import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import FormGroup from '@material-ui/core/FormGroup';
import FormControl from '@material-ui/core/FormControl';
import FormLabel from '@material-ui/core/FormLabel';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Radio from '@material-ui/core/Radio';
import RadioGroup from '@material-ui/core/RadioGroup';


import ExpansionPanel from '@material-ui/core/ExpansionPanel';
import ExpansionPanelDetails from '@material-ui/core/ExpansionPanelDetails';
import ExpansionPanelSummary from '@material-ui/core/ExpansionPanelSummary';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import FloatingSaveButton from "./buttons/FloatingSaveButton";
import Select from "@material-ui/core/Select";
import MenuItem from '@material-ui/core/MenuItem';
import Checkbox from '@material-ui/core/Checkbox';

import moment from 'moment';

const styles = theme => ({
    root: {
        display: 'flex'
    },
    container: {
        //height: "100em"
    },
    heading: {
        fontSize: theme.typography.pxToRem(18),
        flexBasis: '33.33%',
        flexShrink: 0,
    },
});

const Order = inject("ctx")(
    observer(
        class extends React.Component {
            constructor(props) {
                super(props);
                this.props.ctx.users.fetch();
                extendObservable(this, {
                    id: props.router.computedMatch.params.id,
                    isLoading: true,
                    loadingMessage: "loading daily menu...",
                    isSaving: false,
                    availableTables: [],
                    order: {
                        owner: this.props.ctx.auth.user,
                        firstCourse: {},
                        secondCourse: {
                            sideDishes: []
                        }
                    }
                });
                this.props.ctx.stats.fetch((err) => {
                    if (err) {
                        console.error(err);
                        alert(err)
                    } else if (this.props.ctx.stats.dailyMenu && this.props.ctx.stats.dailyMenu.enabled) {
                        if (this.id && this.id !== "new") {
                            this.loadingMessage = "loading daily order..."
                            props.ctx.orders.get(this.id, action((err, order) => {
                                if (err) {
                                    console.error(err);
                                    alert(err)
                                } else {
                                    this.order = order;
                                    this.loadingMessage = "loading tables..."
                                    this.props.ctx.tables.fetch(action((err, tables) => {
                                        if (err) {
                                            console.error(err);
                                        } else if (tables) {
                                            this.availableTables = tables.map(t => {
                                                t.enabled = this.order.menu.tables.map(mt => mt._id).indexOf(t._id) >= 0;
                                                return t;
                                            });
                                            this.isLoading = false;
                                        }
                                    }));
                                }
                            }));
                        } else {
                            this.loadingMessage = "loading tables..."
                            this.props.ctx.tables.fetch(action((err, tables) => {
                                if (err) {
                                    console.error(err);
                                    alert(err);
                                } else if (tables) {
                                    this.availableTables = tables;
                                    this.isLoading = false;
                                }
                            }));
                        }
                    } else {
                        this.showAlert("Error", "Daily menu not available yet", () => {
                            this.props.ctx.history.push('/orders')
                        });
                    }
                });
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

            showAlert = (title, description, cb) => {
                this.props.ctx.dialog.set({
                    open: true,
                    onClose: (response) => {
                        if (cb)
                            cb(response);
                    },
                    showCancel: false,
                    title: title,
                    description: description
                })
            }

            handleChangeOwner = action(event => {
                this.order.owner = event.target.value;
            });

            handleFirstCourseChange = action(event => {
                this.order.firstCourse.item = event.target.value;
                this.order.firstCourse.condiment = null;
            });

            handleCondimentChange = action(event => {
                this.order.firstCourse.condiment = event.target.value;
            });

            handleSecondCourseChange = action(event => {
                this.order.secondCourse.item = event.target.value;
                this.order.firstCourse = {};
            });

            handleSideDishesChange = action(event => {
                const sd = event.target.value,
                    pos = this.order.secondCourse.sideDishes.indexOf(sd);
                if (pos < 0) {
                    this.order.secondCourse.sideDishes.push(sd)
                } else {
                    this.order.secondCourse.sideDishes.splice(pos, 1);
                }
            });

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
                const { classes } = this.props,
                    roles = this.props.ctx.roles,
                    availableCondiments = this.order.firstCourse.item ? this.props.ctx.stats.dailyMenu.firstCourse.items.filter(fc => fc.value === this.order.firstCourse.item)[0].condiments : [];

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
                                {this.isLoading &&
                                    <Grid item xs={12} className={classes.container}>
                                        <h3>{this.loadingMessage}</h3>
                                    </Grid>}
                                {!this.isLoading &&
                                    <Grid item xs={12} className={classes.container}>
                                        <FloatingSaveButton disabled={this.isSaving} onClick={this.handleSave} />
                                        <Grid
                                            container
                                            direction={"column"}
                                            justify={"center"}
                                            alignItems={"stretch"}
                                            spacing={16}
                                        >
                                            {roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.admin) &&
                                                <Grid item xs={12}>
                                                    <h2>Owner</h2>
                                                    {this.id === "new" && <Select
                                                        value={(this.order && this.order.owner && this.order.owner.email) || "None"}
                                                        onChange={(e) => { this.handleChangeOwner(e) }}
                                                    >
                                                        <MenuItem value={null}>None</MenuItem>
                                                        {this.props.ctx.users.users && this.props.ctx.users.users.map((user, i) => { return (<MenuItem key={i} value={user.email}>{user.email}</MenuItem>) })}
                                                    </Select>}
                                                    {this.id !== "new" && <p>{this.order.owner.email}</p>}
                                                </Grid>}
                                            <Grid item xs={12}>
                                                <ExpansionPanel expanded={true} onChange={() => { }}>
                                                    <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                                                        <Typography className={classes.heading}>First course</Typography>
                                                    </ExpansionPanelSummary>
                                                    <ExpansionPanelDetails>
                                                        <Grid container>

                                                            <Grid item xs={12} md={6}>
                                                                <FormControl component="fieldset" required className={classes.formControl}>
                                                                    <RadioGroup
                                                                        aria-label="firstCourse"
                                                                        name="firstCourse"
                                                                        className={classes.group}
                                                                        value={this.order.firstCourse.item}
                                                                        onChange={this.handleFirstCourseChange}
                                                                    >
                                                                        {this.props.ctx.stats.dailyMenu.firstCourse.items.map(fc => <FormControlLabel key={fc.value} value={fc.value} control={<Radio />} label={fc.value} />)}
                                                                    </RadioGroup>
                                                                </FormControl>
                                                            </Grid>
                                                            <Grid item xs={12} md={6}>
                                                                <FormControl component="fieldset" required className={classes.formControl}>

                                                                    <FormLabel component="legend">Condiments</FormLabel>
                                                                    {!availableCondiments.length && <p>No condiments available for the selected dish</p>}
                                                                    {availableCondiments.length > 0 && <RadioGroup
                                                                        aria-label="condiment"
                                                                        name="condiment"
                                                                        className={classes.group}
                                                                        value={this.order.firstCourse.condiment}
                                                                        onChange={this.handleCondimentChange}
                                                                    >
                                                                        {availableCondiments.map(c => <FormControlLabel value={c} control={<Radio />} label={c} />)}
                                                                    </RadioGroup>}

                                                                </FormControl>
                                                            </Grid>

                                                        </Grid>
                                                    </ExpansionPanelDetails>
                                                </ExpansionPanel>
                                                <ExpansionPanel expanded={true} onChange={() => { }}>
                                                    <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
                                                        <Typography className={classes.heading}>Second course</Typography>
                                                    </ExpansionPanelSummary>
                                                    <ExpansionPanelDetails>
                                                        <Grid container>
                                                            <Grid item xs={12}>
                                                                <FormControl component="fieldset" required className={classes.formControl}>
                                                                    <RadioGroup
                                                                        aria-label="secondCourse"
                                                                        name="secondCourse"
                                                                        className={classes.group}
                                                                        value={this.order.secondCourse.item}
                                                                        onChange={this.handleSecondCourseChange}
                                                                    >
                                                                        {this.props.ctx.stats.dailyMenu.secondCourse.items.map(sc => <FormControlLabel key={sc} value={sc} control={<Radio />} label={sc} />)}
                                                                    </RadioGroup>
                                                                </FormControl>
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <FormControl component="fieldset" required className={classes.formControl}>
                                                                    <FormLabel component="legend">Side dishes</FormLabel>
                                                                    <FormGroup>
                                                                        {this.props.ctx.stats.dailyMenu.secondCourse.sideDishes.map(sd => <FormControlLabel
                                                                            key={sd}
                                                                            control={
                                                                                <Checkbox
                                                                                    checked={this.order.secondCourse.sideDishes.indexOf(sd) >= 0}
                                                                                    onChange={this.handleSideDishesChange}
                                                                                    value={sd}
                                                                                />
                                                                            }
                                                                            label={sd}
                                                                        />)}
                                                                    </FormGroup>
                                                                </FormControl>
                                                            </Grid>
                                                        </Grid>
                                                    </ExpansionPanelDetails>
                                                </ExpansionPanel>
                                            </Grid>

                                            <Grid item xs={12}>
                                                {JSON.stringify(this.order)}

                                                {JSON.stringify(this.props.ctx.stats.dailyMenu)}
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