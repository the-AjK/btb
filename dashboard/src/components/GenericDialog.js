/**
 * GenericDialog.js
 * Generic dialog
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer } from "mobx-react";
import Button from "@material-ui/core/Button";
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Checkbox from "@material-ui/core/Checkbox";
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';

const GenericDialog = observer(
    class extends React.Component {
        render() {
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
                                            onChange={this.props.checkBox.onChange}
                                            checked={this.props.checkBox.value}
                                        />
                                    }
                                    label={this.props.checkBox.label}
                                />
                            </FormGroup>
                        }
                    </DialogContent>
                    <DialogActions>
                        {this.props.showCancel && <Button onClick={() => this.props.handleClose(false)} color="primary">
                            {this.props.disagreeText || "Cancel"}
                        </Button>}
                        <Button onClick={() => this.props.handleClose(true)} color="primary" autoFocus>
                            {this.props.agreeText || "OK"}
                        </Button>
                    </DialogActions>
                </Dialog>
            );
        }
    });

export default GenericDialog;