/**
 * Messages.js
 * Messages component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer, inject } from "mobx-react";
import { extendObservable, action } from "mobx";
import { withStyles } from "material-ui/styles";
import FloatingSaveButton from "./buttons/FloatingSaveButton";
import Grid from "material-ui/Grid";
import TextField from 'material-ui/TextField';

const styles = theme => ({
    root: {
        display: 'flex'
    }
});

const Messages = inject("ctx")(
    observer(
        class extends React.Component {

            constructor(props) {
                super(props);
                extendObservable(this, {
                    message: ""                    
                });
            }

            showAlert = (title, description, onClose) => {
                this.props.ctx.dialog.set({
                    open: true,
                    onClose: (response) => {
                        if(onClose)
                            onClose(response);
                    },
                    showCancel: false,
                    title: title,
                    description: description
                })
            }

            send = () => {
                this.props.ctx.auth.updateProfile(this.username, this.email, this.password, (err) => {
                    if (err) {
                        this.showAlert("Error", err);
                    } else {
                        this.showAlert("Success", "Message has been broadcasted!", ()=>{
                           
                        });
                    }
                });
            }

            handleSend = () => {
                this.props.ctx.dialog.set({
                    open: true,
                    showCancel: true,
                    onClose: (response) => {
                        if (response) {
                            this.send();
                        }
                    },
                    title: "Broadcaset message",
                    description: "Are you sure to broadcaste the message?"
                })
            }

            handleChangeField = action((field, event) => {
                this[field] = event.target.value
            });

            render() {
                const { classes } = this.props;
                return (
                    <Grid
                        className={classes.root}
                        container
                        direction={"row"}
                        justify={"center"}
                        alignItems={"stretch"}
                    >
                        <FloatingSaveButton disabled={this.props.ctx.auth.isLoading} onClick={this.handleSend} />
                        <Grid item xs={12} md={6}>
                            <Grid
                                className={classes.root}
                                container
                                direction={"row"}
                                alignItems={"stretch"}
                            >
                                <Grid item xs={12}>
                                    <h2>Broadcast message</h2>
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        id="message"
                                        label="Message"
                                        value={this.message}
                                        placeholder="Message"
                                        onChange={(e) => { this.handleChangeField("message", e) }}
                                        multiline
                                        fullWidth
                                        margin="normal"
                                    />
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                );
            }
        }));

export default withStyles(styles)(Messages);