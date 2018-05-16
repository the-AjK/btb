/**
 * FirstCourse.js
 * First course input component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer } from "mobx-react";
import { extendObservable, action } from "mobx";
import { withStyles } from "material-ui/styles";
import MultipleSelect from "./MultipleSelect";
import Grid from "material-ui/Grid";
import Paper from 'material-ui/Paper';
import CloseIcon from '@material-ui/icons/Close';
import CloneIcon from '@material-ui/icons/ControlPointDuplicate';

const styles = theme => ({
    container: {
        //backgroundColor: "lightGrey"
        padding: "1em"
    },
    title: {
        marginTop: "0",
        marginBottom: "0"
    },
    titleContainer: {
        marginTop: "0",
        marginBottom: "0"
    },
    cloneIcon: {
        cursor: "pointer"
    },
    closeIcon: {
        cursor: "pointer"
    }
});

const FirstCourse = observer(
    class extends React.Component {
        constructor(props) {
            super(props);
            extendObservable(this, {
                focus: false,
                timeout: undefined
            });
        }

        onChange() {
            this.props.onChange(this.props.data.value, this.props.data.condiments)
        }

        handleItemsChange = action(i => {
            this.props.data.value = i[0];
            this.onChange();
        });

        handleCondimentsChange = action(c => {
            this.props.data.condiments = c;
            this.onChange();
        });

        setFocus = action(() => {
            clearTimeout(this.timeout);
            this.focus = true;
        });

        clearFocus = action(() => {
            this.timeout = setTimeout(action(() => {
                this.focus = false;
            }), 500);
        })

        render() {
            const { classes } = this.props;
            return (
                <Paper className={classes.container}>
                    <Grid
                        container
                        direction={"row"}
                        onMouseOver={this.setFocus}
                        //onMouseOut={this.clearFocus}
                    >
                        <Grid item xs={12}>
                            <Grid container direction={"row"} >
                                <Grid item xs={this.props.remove ? 10 : 11}>
                                    <h4 className={classes.title}>First Course</h4>
                                </Grid>
                                {this.props.remove && <Grid item xs={1}>
                                    <span title="Remove"><CloseIcon className={classes.closeIcon}  onClick={this.props.remove} /></span>
                                </Grid>}
                                {this.props.clone && <Grid item xs={1}>
                                    <span title="Clone"><CloneIcon className={classes.cloneIcon} title="Clone" onClick={this.props.clone} /></span>
                                </Grid>}
                            </Grid>
                        </Grid>
                        <Grid item xs={12}>
                            <MultipleSelect
                                placeholder={"First Course"}
                                selectedItem={this.props.data.value && this.props.data.value !== '' ? [this.props.data.value] : []}
                                onChange={this.handleItemsChange}
                                suggestions={this.props.suggestions}
                                showInput={this.focus}
                                showChipDelete={true}
                                multiple={false}
                            />
                            <hr/>
                        </Grid>
                        <Grid item xs={12}>
                            <MultipleSelect
                                placeholder={"Add Condiments"}
                                selectedItem={this.props.data.condiments}
                                onChange={this.handleCondimentsChange}
                                suggestions={this.props.condimentSuggestions}
                                showInput={this.focus && this.props.data.value}
                                showChipDelete={true}
                                multiple={true}
                            />
                        </Grid>
                    </Grid>
                </Paper>
            );
        }
    });

export default withStyles(styles)(FirstCourse);