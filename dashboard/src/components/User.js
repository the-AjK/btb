/**
 * User.js
 * User component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer, inject } from "mobx-react";
import { withStyles } from "@material-ui/core/styles";

const styles = theme => ({

});

const User = inject("ctx")(
    observer(
        class extends React.Component {
            render() {
                //const { classes, theme } = this.props;
                return (
                    <div>
                        <h2>User</h2>
                       
                    </div>
                );
            }
        }));

export default withStyles(styles)(User);