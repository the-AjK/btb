/**
 * Profile.js
 * Profile component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer, inject } from "mobx-react";
import { extendObservable, action } from "mobx";
import { withStyles } from "material-ui/styles";
import Avatar from 'material-ui/Avatar';
import FloatingSaveButton from "./buttons/FloatingSaveButton";
import Grid from "material-ui/Grid";
import TextField from 'material-ui/TextField';
import IconButton from 'material-ui/IconButton';
import Input, { InputLabel, InputAdornment } from 'material-ui/Input';
import Visibility from '@material-ui/icons/Visibility';
import VisibilityOff from '@material-ui/icons/VisibilityOff';
import { FormControl, FormLabel, FormGroup, FormControlLabel } from 'material-ui/Form';
import Validator from "validatorjs";
import Switch from 'material-ui/Switch';

const styles = theme => ({
    root: {
        display: 'flex',
        //flexWrap: 'wrap',
        //height: "100em"
    },
    errorText: {
        color: "red"
    },
    passwordText: {
        width: "100%"
    },
    avatar: {
        margin: 10,
        width: 60,
        height: 60,
    },
    settings: {
        marginTop: "1.5em"
    }
});

const Profile = inject("ctx")(
    observer(
        class extends React.Component {

            constructor(props) {
                super(props);
                extendObservable(this, {
                    username: this.props.ctx.auth.user.username,
                    email: this.props.ctx.auth.user.email,
                    settings: this.props.ctx.auth.user.settings,
                    errors: {
                        email: false,
                        username: false,
                        password: false
                    },
                    showPassword: false,
                    password: "",
                    password2: ""
                });
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

            profileUpdate = () => {
                this.props.ctx.auth.updateProfile(this.username, this.email, this.password, this.settings, (err) => {
                    if (err) {
                        this.showAlert("Error", err);
                    } else {
                        this.showAlert("Success", "Profile updated!");
                        action(() => {
                            this.email = this.props.ctx.auth.user.email;
                            this.username = this.props.ctx.auth.user.username;
                            this.settings = this.props.ctx.auth.user.settings;
                            this.password = "";
                        })()
                    }
                });
            }

            handleProfileUpdate = () => {
                this.props.ctx.dialog.set({
                    open: true,
                    showCancel: true,
                    onClose: (response) => {
                        if (response) {
                            this.profileUpdate();
                        }
                    },
                    title: "Update profile",
                    description: "Are you sure to save the changes?"
                })
            }

            handleSettingsChange = action((e, key) => {
                this.settings[key] = e.target.checked;
            });

            handleMouseDownPassword = event => {
                event.preventDefault();
            };

            handleClickShowPasssword = action(() => {
                this.showPassword = !this.showPassword;
            });

            handleChangeField = action((field, event) => {
                if (field === "password" && event.target.value === "")
                    this.password2 = "";
                if (field === "password" && event.target.value !== "" && event.target.value.length < 8) {
                    this.errors.password = "Password too short [min 8 chars]";
                } else {
                    this.errors.password = false;
                }
                if (field === "email") {
                    let validation = new Validator(
                        { email: event.target.value },
                        { email: "required|email" }
                    );
                    validation.passes();
                    this.errors[field] = validation.errors.first(field)
                }
                if (field === "username") {
                    let validation = new Validator(
                        { username: event.target.value },
                        { username: "required" }
                    );
                    validation.passes();
                    this.errors[field] = validation.errors.first(field)
                }
                this[field] = event.target.value
            });

            render() {
                const { classes } = this.props,
                    roles = this.props.ctx.roles;
                return (
                    <Grid
                        className={classes.root}
                        container
                        direction={"row"}
                        justify={"center"}
                        alignItems={"stretch"}
                    >
                        <FloatingSaveButton disabled={this.props.ctx.auth.isLoading || this.errors.email !== false || this.errors.username !== false || this.password !== this.password2} onClick={this.handleProfileUpdate} />
                        <Grid item xs={12} md={6}>
                            <Grid
                                className={classes.root}
                                container
                                direction={"row"}
                                alignItems={"stretch"}
                                spacing={16}
                            >
                                <Grid item xs={12}>
                                    <h2>Profile</h2>
                                    <Avatar
                                        alt="Avatar"
                                        src="/static/images/profile.jpg"
                                        className={classes.avatar}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Grid
                                        className={classes.root}
                                        container
                                        direction={"row"}
                                        alignItems={"stretch"}
                                        spacing={16}
                                    >
                                        {false && <Grid item xs={12} md={6}>
                                            <TextField
                                                id="username"
                                                label="Username"
                                                value={this.username}
                                                error={this.errors.username !== false}
                                                placeholder="Username"
                                                onChange={(e) => { this.handleChangeField("username", e) }}
                                                fullWidth
                                                margin="normal"
                                            />
                                        </Grid>}
                                        <Grid item xs={12} md={12}>
                                            <TextField
                                                id="email"
                                                label="Email"
                                                type="email"
                                                error={this.errors.email !== false}
                                                value={this.email}
                                                placeholder="Email"
                                                onChange={(e) => { this.handleChangeField("email", e) }}
                                                fullWidth
                                                margin="normal"
                                            />
                                        </Grid>
                                    </Grid>
                                </Grid>
                                <Grid item xs={12}>
                                    <FormControl className={classes.passwordText}>
                                        <InputLabel htmlFor="password">Password
                                        {this.errors.password !== false && <span className={classes.errorText}> {this.errors.password}</span>}
                                        </InputLabel>
                                        <Input
                                            id="password"
                                            type={this.showPassword ? 'text' : 'password'}
                                            value={this.password}
                                            autoComplete="password2"
                                            onChange={(e) => { this.handleChangeField("password", e) }}
                                            error={this.password !== this.password2 || this.errors.password !== false}
                                            fullWidth
                                            endAdornment={
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        aria-label="Toggle password visibility"
                                                        onClick={this.handleClickShowPasssword}
                                                        onMouseDown={this.handleMouseDownPassword}
                                                    >
                                                        {this.showPassword ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            }
                                        />
                                    </FormControl>
                                </Grid>
                                {this.password.length > 0 && <Grid item xs={12}>
                                    <FormControl className={classes.passwordText}>
                                        <InputLabel htmlFor="password">Repeat Password
                                        {this.password !== this.password2 && <span className={classes.errorText}> The passwords doesnt match!</span>}
                                        </InputLabel>
                                        <Input
                                            id="password2"
                                            type={this.showPassword ? 'text' : 'password'}
                                            value={this.password2}
                                            autoComplete={false}
                                            onChange={(e) => { this.handleChangeField("password2", e) }}
                                            error={this.password !== this.password2}
                                            fullWidth
                                            endAdornment={
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        aria-label="Toggle password visibility"
                                                        onClick={this.handleClickShowPasssword}
                                                        onMouseDown={this.handleMouseDownPassword}
                                                    >
                                                        {this.showPassword ? <VisibilityOff /> : <Visibility />}
                                                    </IconButton>
                                                </InputAdornment>
                                            }
                                        />
                                    </FormControl>
                                </Grid>}
                                <Grid item xs={12} className={classes.settings}>
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">User Settings</FormLabel>
                                        <FormGroup>
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={this.settings.dailyMenu}
                                                        onChange={e => this.handleSettingsChange(e, "dailyMenu")}
                                                        value="dailyMenu"
                                                    />
                                                }
                                                label={(this.settings.dailyMenu ? "[ON]" : "[OFF]") + " Telegram daily menu notification"}
                                            />
                                            <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={this.settings.orderReminder}
                                                        onChange={e => this.handleSettingsChange(e, "orderReminder")}
                                                        value="orderReminder"
                                                    />
                                                }
                                                label={(this.settings.orderReminder ? "[ON]" : "[OFF]") + " Telegram daily order reminder"}
                                            />
                                            {roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.admin) && <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={this.settings.adminOrdersCompleteMail}
                                                        onChange={e => this.handleSettingsChange(e, "adminOrdersCompleteMail")}
                                                        value="adminOrdersCompleteMail"
                                                    />
                                                }
                                                label={(this.settings.adminOrdersCompleteMail ? "[ON]" : "[OFF]") + " Order complete email notification [Admin only]"}
                                            />}
                                            {roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.admin) && <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={this.settings.adminReminders}
                                                        onChange={e => this.handleSettingsChange(e, "adminReminders")}
                                                        value="adminReminders"
                                                    />
                                                }
                                                label={(this.settings.adminReminders ? "[ON]" : "[OFF]") + " Admins reminders"}
                                            />}
                                            {roles.checkUserAccessLevel(this.props.ctx.auth.user.role, roles.accessLevels.root) && <FormControlLabel
                                                control={
                                                    <Switch
                                                        checked={this.settings.rootReminders}
                                                        onChange={e => this.handleSettingsChange(e, "rootReminders")}
                                                        value="rootReminders"
                                                    />
                                                }
                                                label={(this.settings.rootReminders ? "[ON]" : "[OFF]") + " Root reminders"}
                                            />}
                                        </FormGroup>
                                    </FormControl>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Grid>
                );
            }
        }));

export default withStyles(styles)(Profile);