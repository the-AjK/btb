/**
 * ActionsButtons.js
 * Actions buttons for tables component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer, inject } from "mobx-react";
import { withStyles } from "material-ui/styles";
import IconButton from 'material-ui/IconButton';
import DeleteIcon from 'material-ui-icons/Delete';
import EditIcon from 'material-ui-icons/ModeEdit';
import UpIcon from 'material-ui-icons/KeyboardArrowUp';
import DownIcon from 'material-ui-icons/KeyboardArrowDown';
import green from 'material-ui/colors/green';
import blue from 'material-ui/colors/blue';

const styles = theme => ({
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
                const { classes, theme } = this.props;
                return (
                    <div>
                        {this.props.edit && <IconButton onClick={this.props.edit} className={classes.edit} >
                            <EditIcon />
                        </IconButton>}
                        {this.props.delete && <IconButton onClick={this.props.delete} className={classes.delete}>
                            <DeleteIcon />
                        </IconButton>}
                    </div>
                );
            }
        }));

export default withStyles(styles)(ActionsButtons);

