/**
 * Login.js
 * Login component
 * @author Alberto Garbui aka JK, https://github.com/the-AjK
 */
// @flow
import React, { Component } from "react";
import ReactDOM from "react-dom";
import { Redirect } from "react-router-dom";
import { extendObservable, action } from "mobx";
import { observer, inject } from "mobx-react";
import { withStyles } from "@material-ui/core/styles";
import TextField from "@material-ui/core/TextField";
import Grid from "@material-ui/core/Grid";
import LinearProgress from '@material-ui/core/LinearProgress';
import Button from "@material-ui/core/Button";
import Validator from "validatorjs";
import FormControl from '@material-ui/core/FormControl';
import FormHelperText from '@material-ui/core/FormHelperText';
import Fade from '@material-ui/core/Fade';
import Slide from '@material-ui/core/Slide';
import CardMedia from '@material-ui/core/CardMedia';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Card from '@material-ui/core/Card';
import Typography from "@material-ui/core/Typography";

const styles = theme => ({
  root: {
    flexGrow: 1,
    position: "relative"
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
  },
  canvas: {
    position: "absolute",
    width: "100%"
  },
  loginError: {
    zIndex: 2000
  },
  progress: {
    zIndex: 2000
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

const startBackgrounAnimation = () => {

  var c = document.getElementById("canv");
  var $ = c.getContext("2d");
  c.width = window.innerWidth;
  c.height = window.innerHeight;

  var max = 100;
  var num = 1;
  var darr = [];
  var dst;
  var gsz = 50;
  var msX = 0;
  var msY = 0;
  dst = Dist(gsz);

  for (var i = 0; i < num; i++) {
    dst.add(Node(c));
  }

  function nPart() {
    var p;
    if (dst.parr.length < max) {
      if (darr.length > 0) {
        p = darr.pop();
        p.res_(msX, msY);
        dst.add(p);
      } else {
        p = Node(c, msX, msY)
        dst.add(p);
      }
    }
    return p;
  }

  var pull = .03;

  function draw() {
    $.fillStyle = 'white';
    $.fillRect(0, 0, c.width, c.height);
    dst.ref();
    var i = dst.parr.length;
    while (i--) {
      var p = dst.parr[i];
      var n = dst.next(p);
      if (n) {
        var l = n.length;
        while (l--) {
          var pnxt = n[l];
          if (pnxt === p) {
            continue;
          }
          conn(p, pnxt);
          var _px = (p.x - pnxt.x) / _dist(pnxt, p);
          var _py = (p.y - pnxt.y) / _dist(pnxt, p);
          p.velX -= _px * pull;
          p.velY -= _py * pull;
        }
      }
    }
    upd();
  }

  function conn(p1, p2) {
    $.strokeStyle = 'hsla(0,0%,45%,1)';
    var dist = _dist(p1, p2);
    $.globalAlpha = 1 - dist / 100;
    $.beginPath();
    $.moveTo(p1.x, p1.y);
    $.lineTo(p2.x, p2.y);
    $.stroke();
  }

  function _dist(p1, p2) {
    var _px = 0;
    var _py = 0;
    _px = p2.x - p1.x;
    _px = _px * _px;
    _py = p2.y - p1.y;
    _py = _py * _py;
    return Math.sqrt(_px + _py);
  }

  function upd() {
    for (var i = 0; i < dst.parr.length; i++) {
      dst.parr[i].upos();
    }
  }

  function pRem(p) {
    var i = dst.rem(p)
    darr.push(i[0]);
  }

  var frict = .9;

  function Node(c, px, py) {
    var _p = {};
    _p.res_ = function (px, py) {
      _p.mass = rnd(1, 10);
      _p.gx = rnd(-5, 5);
      _p.gy = rnd(-5, 5);
      _p.x = px || rnd(10, c.width - 10);
      _p.y = py || rnd(10, c.height - 10);
      _p.gx2 = rnd(-2, 2) * .5;
      _p.gy2 = rnd(-2, 2) * .5;

      var vel = 25;
      _p.velX = rnd(-vel, vel);
      _p.velY = rnd(-vel, vel);
    }
    _p.upos = function () {
      if (Math.abs(_p.velX) < 1 && Math.abs(_p.velY) < 1) pRem(_p);
      if (rnd(0, 100) > 98) {
        var np = nPart();
        if (np) {
          np.res_(_p.x, _p.y);
          np.velX += rnd(-5, 5);
          np.velY += rnd(-5, 5);
        }
      }
      _p.velX *= frict;
      _p.velY *= frict;

      if (_p.x + _p.velX > c.width) _p.velX *= -1;
      else if (_p.x + _p.velX < 0) _p.velX *= -1;
      if (_p.y + _p.velY > c.height) _p.velY *= -1;
      else if (_p.y + _p.velY < 0) _p.velY *= -1;

      conn(_p, {
        x: _p.x + _p.velX,
        y: _p.y + _p.velY
      })
      _p.x += _p.velX;
      _p.y += _p.velY;
    }
    _p.res_(px, py);
    return _p;
  }

  function Dist(gsz) {
    var ret = {};
    ret.gsz = gsz;
    ret.parr = [];
    ret.pos = [];

    ret.next = function (a) {
      var x = Math.ceil(a.x / gsz);
      var y = Math.ceil(a.y / gsz);
      var p = ret.pos;
      var r = p[x][y];

      try {
        if (p[x - 1][y - 1]) {
          r = r.concat(p[x - 1][y - 1]);
        }
      } catch (e) { }
      try {
        if (p[x][y - 1]) {
          r = r.concat(p[x][y - 1]);
        }
      } catch (e) { }
      try {
        if (p[x + 1][y - 1]) {
          r = r.concat(p[x + 1][y - 1]);
        }
      } catch (e) { }
      try {
        if (p[x - 1][y]) {
          r = r.concat(p[x - 1][y]);
        }
      } catch (e) { }
      try {
        if (p[x + 1][y]) {
          r = r.concat(p[x + 1][y]);
        }
      } catch (e) { }
      try {
        if (p[x - 1][y + 1]) {
          r = r.concat(p[x - 1][y + 1]);
        }
      } catch (e) { }
      try {
        if (p[x][y + 1]) {
          r = r.concat(p[x][y + 1]);
        }
      } catch (e) { }
      try {
        if (p[x + 1][y + 1]) {
          r = r.concat(p[x + 1][y + 1]);
        }
      } catch (e) { }
      return r;
    }

    ret.ref = function () {
      ret.pos = [];
      var i = ret.parr.length;
      while (i--) {
        var a = ret.parr[i];
        var x = Math.ceil(a.x / gsz);
        var y = Math.ceil(a.y / gsz);
        if (!ret.pos[x]) ret.pos[x] = [];
        if (!ret.pos[x][y]) ret.pos[x][y] = [a];
      }
    }
    ret.add = function (a) {
      ret.parr.push(a);
    }

    ret.rem = function (a) {
      var i = ret.parr.length;
      while (i--) {
        if (ret.parr[i] === a) return ret.parr.splice(i, 1);
      }
    }
    return ret;
  }

  function rnd(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  window.addEventListener('mousemove', function (e) {
    var np = nPart();
    if (np) np.res_(e.clientX, e.clientY);
  }, false);

  window.addEventListener('touchmove', function (e) {
    //e.preventDefault();
    var np = nPart();
    if (np) np.res_(e.touches[0].clientX, e.touches[0].clientY);
  }, false);

  function run() {
    window.requestAnimationFrame(run);
    draw();
  }
  run();

  window.addEventListener('resize', function () {
    c.width = window.innerWidth;
    c.height = window.innerHeight;
  }, false);


}

const Login = inject("ctx")(
  observer(
    class extends Component {
      constructor() {
        super();
        extendObservable(this, {
          mouse: { x: 0, y: 0 }
        });
      }
      componentDidMount() {
        startBackgrounAnimation();
      }
      _onMouseMove = action((e) => {
        //const w = e.target.getBoundingClientRect();
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
      });
      render() {
        const { classes } = this.props;
        return (
          <Grid container className={classes.root} onMouseMove={this._onMouseMove.bind(this)}>
            <Grid item xs={12}>
              <canvas id='canv' className={classes.canvas}></canvas>
              <Grid
                container
                className={classes.row}
                direction={"row"}
                justify={"center"}
                alignItems={"center"}
              >
                <Grid item xs={8} md={3}>
                  <LoginForm mouse={this.mouse} {...this.props} />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        );
      }
    }));

const LoginForm = inject("ctx")(
  observer(
    class extends Component {
      constructor() {
        super();
        extendObservable(this, {
          logoEl: React.createRef(),
          passInput: React.createRef(),
          mouseTimeout: null,
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

      componentDidUpdate = action(() => {
        let logo = ReactDOM.findDOMNode(this.logoEl);
        if (logo)
          this.logoRect = logo.getBoundingClientRect();
        this.passInputEl = ReactDOM.findDOMNode(this.passInput.current);
      })

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

        let logo = "btb_noeyes.png",
          x = 0,
          y = 0,
          deltaX = 150,
          deltaY = 20;
        if (this.logoRect) {
          x = this.logoRect.left + (this.logoRect.width / 2);
          y = this.logoRect.top + (this.logoRect.height / 4);
        }
        if (this.props.mouse.x < (x - deltaX)) {
          if (this.props.mouse.y < (y - deltaY)) {
            logo = 'btb_lu.png';
          } else if (this.props.mouse.y > (y - deltaY) && this.props.mouse.y < (y + deltaY)) {
            logo = 'btb_ll.png';
          } else {
            logo = 'btb_l.png';
          }
        } else if (this.props.mouse.x > (x - deltaX) && this.props.mouse.x < (x + deltaX)) {
          if (this.props.mouse.y < (y - deltaY)) {
            logo = 'btb_u.png';
          } else if (this.props.mouse.y > (y - deltaY) && this.props.mouse.y < (y + deltaY)) {
            logo = 'btb.png';
          } else {
            logo = 'btb_d.png';
          }
        } else {
          if (this.props.mouse.y < (y - deltaY)) {
            logo = 'btb_ru.png';
          } else if (this.props.mouse.y > (y - deltaY) && this.props.mouse.y < (y + deltaY)) {
            logo = 'btb_rr.png';
          } else {
            logo = 'btb_r.png';
          }
        }

        return (
          <div>
            {!this.props.ctx.auth.isLoading &&
              !this.form.meta.error && (
                <div>
                  <Slide in={true} timeout={500} direction={"down"}>
                    <img
                      className={classes.logo}
                      id="logo"
                      ref={e => { this.logoEl = e; }}
                      alt="BTB"
                      src={"/static/images/" + logo}
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

            {this.props.ctx.auth.isLoading && 
              <Fade in={true} timeout={1000}>
                <LinearProgress />
              </Fade>
            }

            {this.form.meta.error && (
              <div style={{"z-index": 2000}}>
              <Fade in={true} timeout={1000} >
                <LoginError
                  classes={classes}
                  message={this.form.meta.error.toString()}
                  action={e => {
                    e.preventDefault();
                    this.setError(false);
                  }}
                />
              </Fade>
              </div>
            )}
          </div>
        );
      }
    }
  )
);

export default withStyles(styles)(Login);
