/**
 * NotFound.js
 * Page not found component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React, { Component } from "react";
import { Link } from "react-router-dom";
import Grid from "@material-ui/core/Grid";
import { withStyles } from "@material-ui/core/styles";

const styles = theme => ({
  content: {
    textAlign: "center"
  },
});

class NotFound extends Component {
  render() {
    const { classes } = this.props;
    return (
      <Grid
        container
        direction={"row"}
        justify={"center"}
        alignItems={"flex-start"}
      >
        <Grid item xs={12}>
          <div className={classes.content}>
            <img src="/static/images/404.webp" alt="PageNotFound" />
            <h3>
              404 pageNotFound: back to <Link to="/">Home</Link>?
              </h3>
          </div>
        </Grid>
      </Grid>
    );
  }
}

export default withStyles(styles)(NotFound);
