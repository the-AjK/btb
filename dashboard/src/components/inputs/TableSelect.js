/**
 * TableSelect.js
 * Table multiple select component
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

const TableSelect = observer(
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

        handleChange = action((v)=>{
            console.log(v)
            this.props.onChange([])
        });

        clearFocus = action(() => {
            this.timeout = setTimeout(action(() => {
                this.focus = false;
            }), 500);
        });

        render() {
            const { classes, theme } = this.props;
            console.log(this.props.suggestions.map((t)=>{return {label: t.name}}))
            return (
                <Paper className={classes.container}>
                    <Grid
                        container
                        direction={"row"}
                        onMouseOver={this.setFocus}
                        onMouseOut={this.clearFocus}
                    >
                        <Grid item xs={12}>
                            <h4 className={classes.title}>{this.props.title}</h4>
                        </Grid>
                        <Grid item xs={12}>
                            <MultipleSelect
                                placeholder={this.props.placeholder}
                                selectedItem={this.props.selectedItem.map((t)=>t.name)}
                                onChange={this.handleChange}
                                suggestions={this.props.suggestions.map((t)=>{return {label: t.name}})}
                                showInput={this.focus}
                                showChipDelete={true}
                                multiple={true}
                                allowInsert={true}
                            />
                        </Grid>
                    </Grid>
                </Paper>
            );
        }
    });

export default withStyles(styles)(TableSelect);