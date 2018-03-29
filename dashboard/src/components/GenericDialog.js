/**
 * GenericDialog.js
 * Generic dialog
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer } from "mobx-react";
import Button from 'material-ui/Button';
import { FormGroup, FormControlLabel } from 'material-ui/Form';
import Checkbox from 'material-ui/Checkbox';
import Dialog, {
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from 'material-ui/Dialog';

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
                        <DialogContentText id="dialog-description">
                            {this.props.description}
                        </DialogContentText>
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