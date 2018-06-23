/**
 * GenericCourseSelect.js
 * Generic course input component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer } from "mobx-react";
import { extendObservable, action } from "mobx";
import { withStyles } from "@material-ui/core/styles";
import MultipleSelect from "./MultipleSelect";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";

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
    }
});

const GenericCourseSelect = observer(
    class extends React.Component {
        constructor(props) {
            super(props);
            extendObservable(this, {
                focus: false,
                timeout: undefined
            });
        }

        setFocus = action(() => {
            clearTimeout(this.timeout);
            this.focus = true;
        });

        clearFocus = action(() => {
            this.timeout = setTimeout(action(() => {
                this.focus = false;
            }), 500);
        });

        render() {
            const { classes } = this.props;
            return (
                <Paper className={classes.container}>
                    <Grid
                        container
                        direction={"row"}
                        onMouseOver={this.setFocus}
                        //onMouseOut={this.clearFocus}
                        spacing={16}
                    >
                        <Grid item xs={12}>
                            <h4 className={classes.title}>{this.props.title}</h4>
                        </Grid>
                        <Grid item xs={12}>
                            <MultipleSelect
                                placeholder={this.props.placeholder}
                                selectedItem={this.props.selectedItem}
                                onChange={this.props.onChange}
                                suggestions={this.props.suggestions}
                                showInput={this.focus}
                                showChipDelete={true}
                                multiple={true}
                            />
                        </Grid>
                    </Grid>
                </Paper>
            );
        }
    });

export default withStyles(styles)(GenericCourseSelect);