/**
 * Messages.js
 * Messages component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer, inject } from "mobx-react";
import { extendObservable, action } from "mobx";
import { withStyles } from "@material-ui/core/styles";
import FloatingButton from "./buttons/FloatingButton";
import Grid from "@material-ui/core/Grid";
import TextField from "@material-ui/core/TextField";
import API from "./../utils/API";
import MenuItem from '@material-ui/core/MenuItem';
import Select from "@material-ui/core/Select";

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
                    data: {
                        email: this.props.ctx.auth.user.email,
                        message: ""
                    }
                });
                this.api = new API();
                this.props.ctx.users.fetch();
            }

            showAlert = (title, description, onClose) => {
                this.props.ctx.dialog.set({
                    open: true,
                    onClose: (response) => {
                        if (onClose)
                            onClose(response);
                    },
                    showCancel: false,
                    title: title,
                    description: description
                })
            }

            send = () => {
                this.api.broadcastMessage(this.data, (err) => {
                    if (err) {
                        this.showAlert("Error", err);
                    } else {
                        this.showAlert("Success", "Message has been broadcasted!", () => {

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
                if (field === "email" && event.target.value === "None") {
                    this.data.email = null;
                } else {
                    this.data[field] = event.target.value
                }
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
                        <FloatingButton icon={"Send"} disabled={this.props.ctx.auth.isLoading} onClick={this.handleSend} />
                        <Grid item xs={12} md={6}>
                            <Grid
                                className={classes.root}
                                container
                                direction={"row"}
                                alignItems={"stretch"}
                            >
                                <Grid item xs={12}>
                                    <h2>Broadcast message</h2>
                                    <Select
                                        value={this.data.email || "None"}
                                        onChange={(e) => { this.handleChangeField("email", e) }}
                                    >
                                        <MenuItem value={null}>None</MenuItem>
                                        {this.props.ctx.users.users && this.props.ctx.users.users.map((user, i) => { return (<MenuItem key={i} value={user.email}>{user.email}</MenuItem>) })}
                                    </Select>
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        id="message"
                                        label="Message"
                                        value={this.data.message}
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