/**
 * Login.js
 * Login component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React, { Component } from "react";
import { Redirect } from "react-router-dom";
import { extendObservable, action } from "mobx";
import { observer, inject } from "mobx-react";
import { withStyles } from "material-ui/styles";
import TextField from "material-ui/TextField";
import Grid from "material-ui/Grid";
import { LinearProgress } from "material-ui/Progress";
import Button from "material-ui/Button";
import Validator from "validatorjs";
import { FormControl, FormHelperText } from "material-ui/Form";
import Fade from "material-ui/transitions/Fade";
import Slide from "material-ui/transitions/Slide";
import Card, { CardActions, CardContent, CardMedia } from "material-ui/Card";
import Typography from "material-ui/Typography";

const styles = theme => ({
  root: {
    flexGrow: 1
  },
  row: {
    height: "100vh"
  },
  textField: {
    width: "100%"
  },
  buttonClassname: {
    width: "100%",
    marginTop: "1em"
  },
  card: {
    maxWidth: 345
  },
  media: {
    height: 200
  },
  logo: {
    width: "100%",
    padding: "0 4em 1em 4em"
  }
});

const LoginError = class extends Component {
  render() {
    const { classes } = this.props;
    let message;
    try {
      message = JSON.parse(this.props.message);
    } catch (ex) {
      message = this.props.message;
    }
    return (
      <div>
        <Card className={classes.card}>
          <CardMedia
            className={classes.media}
            image="/static/images/wrong_pass.png"
            title="Login error"
          />
          <CardContent>
            <Typography variant="headline" component="h2">
              Are you kidding me!?
            </Typography>
            <Typography component="p">{message.message ? message.message : message}</Typography>
          </CardContent>
          <CardActions>
            <Button size="small" color="primary" onClick={this.props.action}>
              Back
            </Button>
          </CardActions>
        </Card>
      </div>
    );
  }
};

const Login = class extends Component {
  render() {
    const { classes } = this.props;
    return (
      <Grid container className={classes.root}>
        <Grid item xs={12}>
          <Grid
            container
            className={classes.row}
            direction={"row"}
            justify={"center"}
            alignItems={"center"}
          >
            <Grid item xs={8} md={3}>
              <LoginForm {...this.props} />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    );
  }
};

const LoginForm = inject("ctx")(
  observer(
    class extends Component {
      constructor() {
        super();
        extendObservable(this, {
          form: {
            fields: {
              email: {
                value: "",
                error: false,
                rule: "required|email"
              },
              password: {
                value: "",
                error: false,
                rule: "required"
              }
            },
            meta: {
              isValid: false,
              error: false
            }
          }
        });
      }

      setFieldValue = action((field, value) => {
        this.form.fields[field].value = value;
      });

      setFieldError = action((field, value) => {
        this.form.fields[field].error = value;
      });

      setValid = action(value => {
        this.form.meta.isValid = value;
      });

      setError = action(value => {
        this.form.meta.error = value;
        this.form.fields.email.error = false;
        this.form.fields.email.value = "";
        this.form.fields.password.error = false;
        this.form.fields.password.value = "";
      });

      handleKeyPress = event => {
        if (event.key === "Enter" && this.form.meta.isValid) {
          this.login();
        }
      };

      handleChange = field => event => {
        this.setFieldValue(field, event.target.value);
        let { email, password } = this.form.fields;
        var validation = new Validator(
          { email: email.value, password: password.value },
          { email: email.rule, password: password.rule }
        );
        this.setValid(validation.passes());
        this.setFieldError(field, validation.errors.first(field));
      };

      login = () => {
        this.props.ctx.auth.login(
          this.form.fields.email.value,
          this.form.fields.password.value,
          err => {
            if (err) {
              this.setError(err);
            }
          }
        );
      };

      render() {
        const { classes } = this.props;

        const { from } = this.props.location.state || {
          from: { pathname: "/" }
        };
        //const { redirectToReferrer } = this.state;

        const redirectToReferrer = false;

        if (redirectToReferrer) {
          console.log("logged -> " + from);
          return <Redirect to={from} />;
        }

        //already auth redirect
        if (this.props.ctx.auth.isAuth) {
          return <Redirect to="/" />;
        }

        return (
          <div>
            {!this.props.ctx.auth.isLoading &&
              !this.form.meta.error && (
                <div>
                  <Slide in={true} timeout={500} direction={"down"}>
                    <img
                      className={classes.logo}
                      alt="BTB"
                      src="/static/images/btb.png"
                    />
                  </Slide>
                  <form noValidate autoComplete="on">
                    <FormControl
                      className={classes.textField}
                      error={this.form.fields.email.error !== false}
                      aria-describedby="email-error-text"
                    >
                      <TextField
                        id="email"
                        label="Email"
                        autoComplete="email"
                        error={this.form.fields.email.error !== false}
                        onKeyPress={this.handleKeyPress}
                        onChange={this.handleChange("email")}
                        margin="normal"
                      />
                      <FormHelperText id="email-error-text">
                        {this.form.fields.email.error}
                      </FormHelperText>
                    </FormControl>
                    <FormControl
                      className={classes.textField}
                      error={this.form.fields.password.error !== false}
                      aria-describedby="password-error-text"
                    >
                      <TextField
                        id="password"
                        label="Password"
                        error={this.form.fields.password.error !== false}
                        onChange={this.handleChange("password")}
                        type="password"
                        autoComplete="password"
                        onKeyPress={this.handleKeyPress}
                        margin="normal"
                      />
                      <FormHelperText id="password-error-text">
                        {this.form.fields.password.error}
                      </FormHelperText>
                    </FormControl>
                  </form>
                </div>
              )}
            {!this.props.ctx.auth.isLoading &&
              !this.form.meta.error &&
              this.form.fields.email.value.length > 0 &&
              this.form.fields.password.value.length > 0 &&
              !this.form.fields.email.error &&
              !this.form.fields.password.error && (
                <Fade in={true} timeout={1000}>
                  <Button
                    variant="raised"
                    color="primary"
                    className={classes.buttonClassname}
                    disabled={
                      !this.form.meta.isValid || this.props.ctx.auth.isLoading
                    }
                    onClick={this.login}
                  >
                    Login
                  </Button>
                </Fade>
              )}

            {this.props.ctx.auth.isLoading && (
              <Fade in={true} timeout={1000}>
                <LinearProgress />
              </Fade>
            )}

            {this.form.meta.error && (
              <Fade in={true} timeout={1000}>
                <LoginError
                  classes={classes}
                  message={this.form.meta.error.toString()}
                  action={e => {
                    e.preventDefault();
                    this.setError(false);
                  }}
                />
              </Fade>
            )}
          </div>
        );
      }
    }
  )
);

export default withStyles(styles)(Login);
