/**
 * Profile.js
 * Profile component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer, inject } from "mobx-react";
import { withStyles } from "material-ui/styles";
import Avatar from 'material-ui/Avatar';

const styles = theme => ({
      avatar: {
        margin: 10,
        width: 60,
        height: 60,
      },
});

const Profile = inject("ctx")(
    observer(
        class extends React.Component {
            render() {
                const { classes, theme } = this.props;
                return (
                    <div>
                        <h2>Profile</h2>
                        <Avatar
                            alt="Avatar"
                            src="/static/images/profile.jpg"
                            className={classes.avatar}
                        />
                        <h3>{this.props.ctx.auth.user.email}</h3>
                    </div>
                );
            }
        }));

export default withStyles(styles)(Profile);