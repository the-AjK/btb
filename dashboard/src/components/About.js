/**
 * About.js
 * About component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer, inject } from "mobx-react";
import { withStyles } from "material-ui/styles";
import Button from 'material-ui/Button';
import Grid from "material-ui/Grid";
import Hidden from "material-ui/Hidden";

const styles = theme => ({
    root: {
        display: 'flex'
    },
    hidden: {
        minHeight: "3em",
        display: "block"
    },
    version: {
        fontSize: "0.5em",
    }
});

const About = inject("ctx")(
    observer(
        class extends React.Component {
            render() {
                const { classes, theme } = this.props;
                return (
                    <Grid
                        className={classes.root}
                        container
                        direction={"row"}
                        justify={"center"}
                        alignItems={"stretch"}
                    >
                        <Grid item xs={12} md={8}>
                            <Hidden only={['xs', 'sm']} >
                                <span className={classes.hidden}/>
                            </Hidden>

                            <Grid container className={classes.root} direction={"row"} justify={"center"} alignItems={"stretch"}>
                                <Grid item xs={12} md={4}>
                                    <Grid container className={classes.root} justify={"center"} direction={"row"}>
                                        <Grid item xs={10} md={10}>
                                            <img width="100%" alt="aboutBTB" src="/static/images/3d.webp" />
                                        </Grid>
                                    </Grid>
                                </Grid>
                                <Grid  item xs={12} md={8}>
                                    <Grid container className={classes.root} direction={"column"} justify={"center"} alignItems={"stretch"}>
                                        <Grid item xs={12} md={12}>
                                            <h3>BiteTheBot <span className={classes.version}>(v1.0.0)</span></h3>
                                            <p>BiteTheBot aka BTB is a smart menu ordering system.</p>
                                            <h4>About me</h4>
                                            <p>I'm Alberto Garbui. I do stuff.</p>
                                        </Grid>
                                        <Grid item xs={12} md={12}>
                                            <Grid container justify={"center"} direction={"row"}>
                                                <Grid item xs={12} md={12}>
                                                    <Button size="small" color="primary">
                                                        <a target="_blank" rel="noopener noreferrer" href="https://telegram.me/bitethebot">Telegram bot</a>
                                                    </Button>
                                                    <Button size="small" color="primary">
                                                        <a href="mailto:alberto.garbui@gmail.com?subject=BiteTheBot">Contact me</a>
                                                    </Button>
                                                    <Button size="small" color="primary">
                                                        <a target="_blank" rel="noopener noreferrer" href="https://www.paypal.me/AlbertoGarbui">Give me a beer!</a>
                                                    </Button>
                                                </Grid>
                                            </Grid>
                                        </Grid>
                                    </Grid>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>

                );
            }
        }));

export default withStyles(styles)(About);