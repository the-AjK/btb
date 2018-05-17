/**
 * Menu.js
 * Menu component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer, inject } from "mobx-react";
import { extendObservable, action } from "mobx";
import { withStyles } from "material-ui/styles";
import TextField from 'material-ui/TextField';
import { FormGroup, FormControl, FormLabel, FormHelperText, FormControlLabel } from 'material-ui/Form';
import Checkbox from 'material-ui/Checkbox';
import Switch from 'material-ui/Switch';
import Grid from "material-ui/Grid";
import FirstCourseSelect from "./inputs/FirstCourseSelect";
import GenericCourseSelect from "./inputs/GenericCourseSelect";
import FloatingSaveButton from "./buttons/FloatingSaveButton";
import Button from 'material-ui/Button';
import TimePicker from 'react-times';

import 'react-times/css/material/default.css';
import 'react-times/css/classic/default.css';

import moment from 'moment';

const styles = theme => ({
    root: {
        display: 'flex',
        //flexWrap: 'wrap',
        //height: "100em"
    },
    container: {
        //height: "100em"
    },
    margin: {
        margin: theme.spacing.unit,
    },
    withoutLabel: {
        marginTop: theme.spacing.unit * 3,
    },
    textField: {
        flexBasis: 200,
    },
    selected: {
        fontWeight: theme.typography.fontWeightMedium,
    },
    unselected: {
        fontWeight: theme.typography.fontWeightRegular
    },
    tables: {
        marginTop: "1em"
    }
});

const Menu = inject("ctx")(
    observer(
        class extends React.Component {
            constructor(props) {
                super(props);
                extendObservable(this, {
                    firstCoursesPanels: [0, 1],
                    id: props.router.computedMatch.params.id,
                    sendNotifications: true,
                    isSaving: false,
                    condimentSuggestions: props.ctx.menus.suggestions.condiments.map(c => { return { label: c } }),
                    suggestions: props.ctx.menus.suggestions.fc.map(fc => { return { label: fc } }),
                    secondCourseSuggestions: props.ctx.menus.suggestions.sc.map(sc => { return { label: sc } }),
                    sideDishesSuggestions: props.ctx.menus.suggestions.sideDishes.map(sd => { return { label: sd } }),
                    availableTables: [],
                    menu: {
                        label: "Autostop daily menu",
                        deadline: moment("11:00", "HH:mm").format("HH:mm"),
                        enabled: false,
                        day: moment().format("YYYY-MM-DD"),
                        firstCourse: {
                            items: [{
                                key: 0,
                                value: "Insalatona Venezia",
                                condiments: []
                            }, {
                                key: 1,
                                value: "Insalatona Bologna",
                                condiments: []
                            }]
                        },
                        secondCourse: {
                            items: [],
                            sideDishes: []
                        },
                        additionalInfos: "",
                        tables: []
                    }
                });
                this.props.ctx.menus.getSuggestions(() => {
                    this.updateSuggestions();
                });
                if (this.id && this.id !== "new") {
                    props.ctx.menus.get(this.id, action((err, menu) => {
                        if (err) {
                            alert(err)
                        } else {
                            menu.additionalInfos = menu.additionalInfos || '';
                            menu.label = menu.label || '';
                            menu.deadline = moment(menu.deadline).format("HH:mm");
                            menu.day = moment(menu.day).format("YYYY-MM-DD");
                            this.firstCoursesPanels = [];
                            this.menu = menu;
                            for (let i = 0; i < menu.firstCourse.items.length; i++) {
                                if (i > 1)
                                    this.firstCoursesPanels.push(i)
                                menu.firstCourse.items[i].key = i;
                            }
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

            updateSuggestions = action(() => {
                this.condimentSuggestions = this.props.ctx.menus.suggestions.condiments.map(c => { return { label: c } });
                this.suggestions = this.props.ctx.menus.suggestions.fc.map(fc => { return { label: fc } });
                this.secondCourseSuggestions = this.props.ctx.menus.suggestions.sc.map(sc => { return { label: sc } });
                this.sideDishesSuggestions = this.props.ctx.menus.suggestions.sideDishes.map(sd => { return { label: sd } });
            });

            handleChangeFirstCourse = key => action((value, condiments) => {
                let found = false;
                for (let i = 0; i < this.menu.firstCourse.items.length; i++) {
                    if (this.menu.firstCourse.items[i].key === key) {
                        this.menu.firstCourse.items[i] = {
                            key: key,
                            value: value,
                            condiments: condiments
                        }
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    this.menu.firstCourse.items.push({
                        key: key,
                        value: value,
                        condiments: condiments
                    });
                }
            });

            addFirstCoursePanel = action(() => {
                this.menu.firstCourse.items.push({
                    key: this.firstCoursesPanels.length,
                    value: undefined,
                    condiments: []
                });
                this.firstCoursesPanels.push(this.firstCoursesPanels.length);
            });

            handleCloneFirstCoursePanel = action((fc) => {
                this.menu.firstCourse.items.push({
                    key: this.firstCoursesPanels.length,
                    value: fc.value,
                    condiments: JSON.parse(JSON.stringify(fc.condiments))
                });
                this.firstCoursesPanels.push(this.firstCoursesPanels.length);
            });

            //remove a whole first course panel
            removeFirstCourse = key => action(() => {
                this.firstCoursesPanels.splice(this.firstCoursesPanels.indexOf(key), 1);
                for (let i = 0; i < this.menu.firstCourse.items.length; i++) {
                    if (this.menu.firstCourse.items[i].key === key) {
                        this.menu.firstCourse.items.splice(i, 1)
                        break;
                    }
                }
            })

            renderFirstCourses = () => {
                return this.firstCoursesPanels.map((i) => (
                    <Grid item xs={12} key={i}>
                        <FirstCourseSelect
                            condimentSuggestions={this.condimentSuggestions}
                            suggestions={this.suggestions}
                            data={this.menu.firstCourse.items[i]}
                            remove={i === 0 && this.menu.firstCourse.items.length > 1 ? false : this.removeFirstCourse(i)}
                            onChange={(v, c) => this.handleChangeFirstCourse(i)(v, c)}
                            clone={() => this.handleCloneFirstCoursePanel(this.menu.firstCourse.items[i])}
                        />
                    </Grid>));
            }

            handleEnabled = action((e) => {
                this.menu.enabled = e.target.checked;
            })

            handleNotifications = action((e) => {
                this.sendNotifications = e.target.checked;
            })

            handleSecondCourse = action((i) => {
                this.menu.secondCourse.items = i;
            });

            handleSideDishes = action((s) => {
                this.menu.secondCourse.sideDishes = s;
            });

            handleChangeField = action((field, event) => {
                this.menu[field] = event.target.value;
            });

            handleDeadlineChange = action((value) => {
                this.menu.deadline = value;
            });

            handleTableChange = action((event, index) => {
                this.availableTables[index].enabled = event.target.checked;
            });

            menuIsValid = (cb) => {
                if (!this.menu.day) {
                    cb("Menu date is required")
                    return false;
                }
                if (this.availableTables.filter(t => t.enabled).length === 0) {
                    cb("At least one table shall be enabled");
                    return false;
                }
                if (this.menu.firstCourse && this.menu.firstCourse.items) {
                    for (let i = 0; i < this.menu.firstCourse.items.length; i++) {
                        let fc = this.menu.firstCourse.items[i];
                        if (fc.value === undefined || fc.value.trim() === "") {
                            cb("Invalid menu firstCourse item");
                            return false;
                        }
                        for (let j = 0; j < fc.condiments.length; j++) {
                            let condiment = fc.condiments[j];
                            if (condiment === undefined || condiment.trim() === "") {
                                cb("Invalid menu firstCourse item condiment");
                                return false;
                            }
                        }
                    }
                } else {
                    cb("Invalid menu firstCourse");
                    return false;
                }
                if (this.menu.firstCourse && this.menu.firstCourse.items && this.menu.firstCourse.items.length === 0 &&
                    this.menu.secondCourse && this.menu.secondCourse.items && this.menu.secondCourse.items.length === 0
                ) {
                    cb("Invalid empty menu");
                    return false;
                }
                cb();
            }

            handleSave = () => {
                let message = "Are you sure to save the changes?",
                    warnings = "";
                if (this.menu.firstCourse.items.length === 0) {
                    warnings += "\n - First courses list is empty!";
                }
                if (this.menu.secondCourse.items.length === 0) {
                    warnings += "\n - Second courses list is empty!";
                }
                if (this.menu.secondCourse.sideDishes.length === 0) {
                    warnings += "\n - Side dishes list is empty!";
                }
                if (this.menu.enabled === false) {
                    warnings += "\n - Menu is not enabled, users won't be notified";
                }
                if (warnings !== "") {
                    message += "\n\nWarnings:\n" + warnings;
                }
                this.menuIsValid((err) => {
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
                this.menu.tables = this.availableTables.filter(t => t.enabled);
                if (this.id && this.id !== "new") {
                    //Update
                    this.menu.sendNotification = true
                    this.props.ctx.menus.update(this.id, this.menu, action((err, res) => {
                        if (err) {
                            this.showAlert("Error", err);
                        } else {
                            this.showAlert("Success", "Menu updated!");
                        }
                        this.isSaving = false;
                    }));
                } else {
                    this.menu.sendNotification = true
                    this.props.ctx.menus.add(this.menu, action((err, res) => {
                        if (err) {
                            this.showAlert("Error", err);
                        } else if (res) {
                            this.props.ctx.history.push("/menus/" + res._id)
                            this.id = res._id;
                            this.showAlert("Success", "Menu created!");
                        }
                        this.isSaving = false;
                    }));
                }
            })

            render() {
                const { classes } = this.props;
                const isDailyMenu = moment(this.menu.day).isSame(moment(), 'day');
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
                                    {this.id !== "new" && <h2>Edit {isDailyMenu ? "daily" : ""} Menu</h2>}
                                    {this.id === "new" && <h2>Add {isDailyMenu ? "daily" : ""} Menu</h2>}
                                </Grid>
                                {this.props.ctx.menus.isLoading &&
                                    <Grid item xs={12} className={classes.container}>
                                        <h3>Loading... please wait</h3>
                                    </Grid>}
                                {!this.props.ctx.menus.isLoading &&
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
                                                <TextField
                                                    id="label"
                                                    label="Label"
                                                    value={this.menu.label}
                                                    placeholder="Menu label"
                                                    onChange={(e) => { this.handleChangeField('label', e) }}
                                                    fullWidth
                                                    margin="normal"
                                                />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <Grid container direction={"row"} spacing={16}>
                                                    <Grid item xs={12} md={4}>
                                                        <TextField
                                                            id="day"
                                                            fullWidth
                                                            label="Day"
                                                            type="date"
                                                            value={this.menu.day}
                                                            //className={classes.textField}
                                                            onChange={(e) => { this.handleChangeField('day', e) }}
                                                        />
                                                    </Grid>
                                                    <Grid item xs={12} md={4}>
                                                        <TimePicker
                                                            onTimeChange={this.handleDeadlineChange}
                                                            time={this.menu.deadline}
                                                            theme="material"
                                                            timeMode="24"
                                                            //showTimezone={true} 
                                                            timezone="Europe/Rome"
                                                        />
                                                    </Grid>
                                                    <Grid item xs={12} md={4}>
                                                        <FormGroup>
                                                            <FormControlLabel
                                                                control={
                                                                    <Switch
                                                                        checked={this.menu.enabled}
                                                                        onChange={this.handleEnabled}
                                                                    />
                                                                }
                                                                label={this.menu.enabled ? "Enabled" : "Disabled"}
                                                            />
                                                        </FormGroup>
                                                    </Grid>
                                                </Grid>
                                            </Grid>

                                            {this.renderFirstCourses()}

                                            <Grid item xs={12}>
                                                <Button onClick={this.addFirstCoursePanel} color="primary" className={classes.button}>
                                                    Add First Course
                                                </Button>
                                            </Grid>

                                            <Grid item xs={12}>
                                                <GenericCourseSelect
                                                    title={"Second Course"}
                                                    placeholder={"Add Second course"}
                                                    suggestions={this.secondCourseSuggestions}
                                                    selectedItem={this.menu.secondCourse.items}
                                                    onChange={this.handleSecondCourse}
                                                />
                                            </Grid>

                                            <Grid item xs={12}>
                                                <GenericCourseSelect
                                                    title={"Side dishes"}
                                                    placeholder={"Add Side dishes"}
                                                    suggestions={this.sideDishesSuggestions}
                                                    selectedItem={this.menu.secondCourse.sideDishes}
                                                    onChange={this.handleSideDishes}
                                                />
                                            </Grid>

                                            <Grid item xs={12}>
                                                <TextField
                                                    id="infos"
                                                    label="Additional Informations"
                                                    value={this.menu.additionalInfos}
                                                    placeholder="Add Additional Informations"
                                                    onChange={(e) => { this.handleChangeField('additionalInfos', e) }}
                                                    fullWidth
                                                    margin="normal"
                                                />
                                            </Grid>

                                            <Grid item xs={12} className={classes.tables}>
                                                <FormControl component="fieldset">
                                                    <FormLabel component="legend">Available tables</FormLabel>
                                                    <FormGroup>
                                                        {this.availableTables.map((t, i) => {
                                                            return (
                                                                <FormControlLabel
                                                                    key={i}
                                                                    control={
                                                                        <Checkbox
                                                                            checked={this.availableTables[i].enabled}
                                                                            onChange={e => this.handleTableChange(e, i)}
                                                                            value={t.name}
                                                                        />
                                                                    }
                                                                    label={t.name}
                                                                />
                                                            )
                                                        })}
                                                    </FormGroup>
                                                    {this.availableTables.filter(t => t.enabled).length === 0 &&
                                                        <FormHelperText>At least one table shall be selected</FormHelperText>
                                                    }
                                                </FormControl>
                                            </Grid>

                                        </Grid>
                                    </Grid>}
                            </Grid>
                        </Grid>
                    </Grid>
                );
            }
        }));

export default withStyles(styles)(Menu);