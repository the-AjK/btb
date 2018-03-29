/**
 * FloatingAddButton.js
 * Floating add button component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer, inject } from "mobx-react";
import { withStyles } from "material-ui/styles";
import Button from 'material-ui/Button';
import AddIcon from 'material-ui-icons/Add';
import Slide from 'material-ui/transitions/Slide';
import green from 'material-ui/colors/green';

const styles = theme => ({
    add: {
        zIndex: 2000,
        position: 'absolute',
        bottom: theme.spacing.unit * 4,
        right: theme.spacing.unit * 4,
    }
});

const FloatingAddButton = inject("ctx")(
    observer(
        class extends React.Component {
            render() {
                const { classes, theme } = this.props;
                return (
                    <Slide className={classes.add} direction="up" in={true}>
                        <Button onClick={this.props.onClick} variant="fab" color="secondary" aria-label="add">
                            <AddIcon />
                        </Button>
                    </Slide>
                );
            }
        }));

export default withStyles(styles)(FloatingAddButton);

