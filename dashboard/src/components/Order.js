/**
 * Order.js
 * Order component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React from "react";
import { observer, inject } from "mobx-react";
import { withStyles } from "material-ui/styles";

const styles = theme => ({

});

const Order = inject("ctx")(
    observer(
        class extends React.Component {
            render() {
                //const { classes, theme } = this.props;
                return (
                    <div>
                        <h2>Order</h2>
                    </div>
                );
            }
        }));

export default withStyles(styles)(Order);