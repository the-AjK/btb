/**
 * BenderBottom.js
 * BenderBottom easter egg component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer, inject } from "mobx-react";
import { extendObservable, action } from "mobx";
import { withStyles } from "material-ui/styles";
import Slide from 'material-ui/transitions/Slide';

const styles = theme => ({
    image: {
        position: 'absolute',
        bottom: 0,
        right: theme.spacing.unit * 5,
    }
});

const BenderBottom = inject("ctx")(
    observer(
        class extends React.Component {
            constructor() {
                super();
                extendObservable(this, {
                    show: true,
                    speed: 0,
                    timeoutHidden: undefined,
                });
            }
            showHide = action((value, speed) => {
                this.speed = speed;
                this.show = value;
            });
            componentDidMount() {
                
                //window.ifvisible.setIdleDuration(10);
                window.ifvisible.on("blur", () => {
                    this.timeoutHidden = setTimeout(() => {
                        this.showHide(true, 0)
                    }, 10000);
                });

                window.ifvisible.idle(() => {
                    //this.showHide(true, 500)
                });

                window.ifvisible.on("focus", () => {
                    clearTimeout(this.timeoutHidden);
                });
                window.ifvisible.on("wakeup", () => {
                    setTimeout(() => this.showHide(false, 500), 1000);
                });

                setTimeout(() => this.showHide(false, 500), 1000);
            }
            render() {
                const { classes, theme } = this.props;
                
                return (
                    <Slide in={this.show} timeout={this.speed} direction={"up"} className={classes.image}>
                        <img
                            alt="BTB"
                            src="/static/images/bender_bottom.png"
                        />
                    </Slide>
                );
            }
        }));

export default withStyles(styles)(BenderBottom);