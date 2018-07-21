/**
 * ActionsButtons.js
 * Actions buttons for tables component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer, inject } from "mobx-react";
import { withStyles } from "@material-ui/core/styles";
import IconButton from "@material-ui/core/IconButton";
import DeleteIcon from "@material-ui/icons/Delete";
import EditIcon from "@material-ui/icons/ModeEdit";
import ViewIcon from "@material-ui/icons/Visibility";
import blue from "@material-ui/core/colors/blue";

const styles = theme => ({
    view: {
        color: blue[500],
    },
    edit: {
        color: blue[500],
    },
    delete: {
        color: blue[500],
    }
});

const ActionsButtons = inject("ctx")(
    observer(
        class extends React.Component {
            render() {
                const { classes } = this.props;
                return (
                    <div>
                        {this.props.view && <IconButton title="View" onClick={this.props.view} className={classes.view} >
                            <ViewIcon />
                        </IconButton>}
                        {this.props.edit && <IconButton title="Edit" onClick={this.props.edit} className={classes.edit} >
                            <EditIcon />
                        </IconButton>}
                        {this.props.delete && <IconButton title="Delete" onClick={this.props.delete} className={classes.delete}>
                            <DeleteIcon />
                        </IconButton>}
                    </div>
                );
            }
        }));

export default withStyles(styles)(ActionsButtons);

