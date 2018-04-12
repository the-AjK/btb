/**
 * FloatingButton.js
 * Floating button component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer, inject } from "mobx-react";
import { withStyles } from "material-ui/styles";
import Button from 'material-ui/Button';
import Slide from 'material-ui/transitions/Slide';
import * as Icons from 'material-ui-icons';

const styles = theme => ({
    save: {
        zIndex: 2000,
        position: 'absolute',
        bottom: theme.spacing.unit * 4,
        right: theme.spacing.unit * 4,
    }
});

const FloatingButton = inject("ctx")(
    observer(
        class extends React.Component {
            render() {
                const { classes } = this.props,
                    Icon = Icons[this.props.icon];
                return (
                    <Slide className={classes.save} direction="up" in={true}>
                        <Button onClick={this.props.onClick} disabled={this.props.disabled} variant="fab" color="secondary" aria-label="save">
                            <Icon/>
                        </Button>
                    </Slide>
                );
            }
        }));

export default withStyles(styles)(FloatingButton);

