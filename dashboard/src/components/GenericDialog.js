/**
 * GenericDialog.js
 * Generic dialog
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer } from "mobx-react";
import { extendObservable, action } from "mobx";
import { withStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from "@material-ui/core/Checkbox";
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';

const styles = theme => ({
    textField: {
        marginLeft: theme.spacing.unit,
        marginRight: theme.spacing.unit,
        width: 200,
    },
});

const GenericDialog = observer(
    class extends React.Component {
        constructor(props) {
            super(props)
            extendObservable(this, {
                checked: props.checkBox ? props.checkBox.value : false,
                inputNumber: props.inputNumber ? props.inputNumber.value : 0,
                inputText: ""
            });
        }

        render() {
            const { classes } = this.props;
            return (
                <Dialog
                    open={this.props.open}
                    onClose={() => this.props.handleClose(false)}
                    aria-labelledby="dialog-title"
                    aria-describedby="dialog-description"
                >
                    <DialogTitle id="dialog-title">{this.props.title || "BTB"}</DialogTitle>
                    <DialogContent>
                        {this.props.description && this.props.description.split("\n").map((i, k) => {
                            return <DialogContentText key={k}>{i}</DialogContentText>;
                        })}
                        {this.props.extraContent}
                        {this.props.checkBox &&
                            <FormGroup>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            onChange={action(e => this.checkBox = e.target.value)}
                                            checked={this.checked}
                                        />
                                    }
                                    label={this.props.checkBox.label}
                                />
                            </FormGroup>
                        }
                        {this.props.inputNumber &&
                            <TextField
                                id="number"
                                label={this.props.inputNumber.label}
                                value={this.inputNumber}
                                onChange={action(e => { if (e.target.value >= this.props.inputNumber.min) this.inputNumber = e.target.value })}
                                type="number"
                                className={classes.textField}
                                InputLabelProps={{
                                    shrink: true,
                                }}
                                margin="normal"
                            />
                        }
                    </DialogContent>
                    <DialogActions>
                        {this.props.showCancel && <Button onClick={() => this.props.handleClose(false)} color="primary">
                            {this.props.disagreeText || "Cancel"}
                        </Button>}
                        <Button onClick={() => this.props.handleClose(true, this.inputNumber, this.checked)} color="primary" autoFocus>
                            {this.props.agreeText || "OK"}
                        </Button>
                    </DialogActions>
                </Dialog>
            );
        }
    });

export default withStyles(styles)(GenericDialog);