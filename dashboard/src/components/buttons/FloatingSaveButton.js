/**
 * FloatingSaveButton.js
 * Floating save button component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer, inject } from "mobx-react";
import { withStyles } from "material-ui/styles";
import Button from 'material-ui/Button';
import SaveIcon from 'material-ui-icons/Save';
import Slide from 'material-ui/transitions/Slide';

const styles = theme => ({
    save: {
        zIndex: 2000,
        position: 'absolute',
        bottom: theme.spacing.unit * 4,
        right: theme.spacing.unit * 4,
    }
});

const FloatingSaveButton = inject("ctx")(
    observer(
        class extends React.Component {
            render() {
                const { classes } = this.props;
                return (
                    <Slide className={classes.save} direction="up" in={true}>
                        <Button onClick={this.props.onClick} disabled={this.props.disabled} variant="fab" color="secondary" aria-label="save">
                            <SaveIcon />
                        </Button>
                    </Slide>
                );
            }
        }));

export default withStyles(styles)(FloatingSaveButton);

