/**
 * FloatingButtons.js
 * Floating buttons component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer, inject } from "mobx-react";
import { extendObservable, action } from "mobx";
import { withStyles } from "material-ui/styles";
import Button from 'material-ui/Button';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/ModeEdit';
import UpIcon from '@material-ui/icons/KeyboardArrowUp';
import DownIcon from '@material-ui/icons/KeyboardArrowDown';
import Slide from 'material-ui/transitions/Slide';
import green from 'material-ui/colors/green';
import blue from 'material-ui/colors/blue';

const styles = theme => ({
    edit: {
        position: 'absolute',
        bottom: theme.spacing.unit * 24,
        right: theme.spacing.unit * 4,
        color: theme.palette.common.white,
        backgroundColor: blue[500],
    },
    delete: {
        position: 'absolute',
        bottom: theme.spacing.unit * 14,
        right: theme.spacing.unit * 4,
    },
    add: {
        position: 'absolute',
        bottom: theme.spacing.unit * 14,
        right: theme.spacing.unit * 4,
        color: theme.palette.common.white,
        backgroundColor: green[500],
    },
    updown: {
        position: 'absolute',
        bottom: theme.spacing.unit * 4,
        right: theme.spacing.unit * 4,
    }
});

const FloatingButtons = inject("ctx")(
    observer(
        class extends React.Component {
            constructor(props) {
                super(props)
                extendObservable(this, {
                    isOpen: true
                });
            }
            setOpen = action((value) => {
                this.isOpen = value;
            });
            render() {
                const { classes, theme } = this.props;
                return (
                    <div>
                        {!this.props.isEdit && <Slide className={classes.add} direction="up" in={this.isOpen}>
                            <Button onClick={this.props.add} variant="fab" color={"inherit"} aria-label="add">
                                <AddIcon />
                            </Button>
                        </Slide>}
                        {this.props.isEdit && <div>
                            <Slide className={classes.edit} direction="up" in={this.isOpen}>
                                <Button variant="fab" color={"inherit"} >
                                    <EditIcon />
                                </Button>
                            </Slide>
                            <Slide className={classes.delete} direction={"up"} in={this.isOpen}>
                                <Button variant="fab" color="secondary" aria-label="delete">
                                    <DeleteIcon />
                                </Button>
                            </Slide>
                        </div>}

                        <Button variant="fab" aria-label="open" onClick={() => { this.setOpen(!this.isOpen) }} className={classes.updown}>
                            {!this.isOpen && <UpIcon />}
                            {this.isOpen && <DownIcon />}
                        </Button>
                    </div>
                );
            }
        }));

export default withStyles(styles)(FloatingButtons);

